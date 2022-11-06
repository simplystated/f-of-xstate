import * as fc from "fast-check";
import type { StateNodeConfig } from "xstate";

const depthIdentifier = fc.createDepthIdentifier();

type AnyStateNodeConfig = StateNodeConfig<any, any, any, any>;

class MachineArbitrary extends fc.Arbitrary<AnyStateNodeConfig> {
  private usedStateNames: string[] = [];
  private remainingStateNames: string[];
  private arbitrary: fc.Arbitrary<AnyStateNodeConfig>;

  constructor(private stateNames: string[]) {
    super();
    this.remainingStateNames = stateNames.slice(0, -1);
    this.arbitrary = this.createArbitrary();
  }

  createArbitrary() {
    const consumingStateArbitrary = fc
      .integer({ min: 0, max: this.stateNames.length })
      .map((n) => {
        if (this.remainingStateNames.length === 0) {
          return void 0;
        }

        const idx =
          ((n % this.remainingStateNames.length) +
            this.remainingStateNames.length) %
          this.remainingStateNames.length;
        const stateName = this.remainingStateNames.splice(idx, 1)[0];
        this.usedStateNames.push(stateName);
        return stateName;
      });
    const usedStateNameArbitrary = fc
      .integer({ min: 0, max: this.stateNames.length })
      .map((n) => {
        const idx =
          ((n % this.usedStateNames.length) + this.usedStateNames.length) %
          this.usedStateNames.length;
        return this.usedStateNames[idx];
      });
    const eventArbitrary = fc.record({
      target: fc.oneof(
        { depthIdentifier },
        fc.constant(void 0),
        usedStateNameArbitrary.map((t) => (!!t ? `#${t}` : void 0))
      ),
      actions: fc.array(fc.string(), { maxLength: 3, depthIdentifier }),
      cond: fc.option(fc.string()),
      delay: fc.string(),
    });
    const generateStates = (
      atomic: fc.Arbitrary<any>,
      arb: fc.Arbitrary<any>
    ) =>
      atomic.chain((baseState) =>
        this.remainingStateNames.length === 0
          ? fc.constant(void 0)
          : fc
              .array(
                fc.tuple(fc.constantFrom(...this.remainingStateNames), arb),
                {
                  maxLength: Math.min(this.remainingStateNames.length, 5),
                }
              )
              .map((allStates) => {
                const stateSet = new Set(
                  allStates
                    .map(([stateName]) => stateName)
                    .filter((s) => typeof s !== "undefined")
                );
                const states = Array.from(stateSet);
                this.remainingStateNames = this.remainingStateNames.filter(
                  (s) => !stateSet.has(s)
                );
                this.usedStateNames = this.usedStateNames.concat(states);
                return allStates
                  .filter(([stateName]) => typeof stateName !== "undefined")
                  .reduce(
                    (states, [stateName, state]) => ({
                      ...states,
                      [stateName!]: {
                        ...(state as any),
                        id: stateName,
                      },
                    }),
                    {}
                  );
              })
              .map((states) => ({
                ...(baseState as any),
                states,
              }))
      );

    const { machine: arbitraryMachine } = fc.letrec((tie) => ({
      machine: fc
        .oneof(
          { maxDepth: 3, withCrossShrink: true, depthIdentifier },
          tie("atomicState"),
          tie("compoundState"),
          tie("parallelState")
        )
        .map((rootMachine: any) => {
          const { onDone: _, ...machine } = rootMachine;
          return machine;
        }),
      state: fc.oneof(
        { maxDepth: 3, withCrossShrink: true, depthIdentifier },
        tie("atomicState"),
        tie("finalState"),
        tie("historyState"),
        tie("compoundState"),
        tie("parallelState")
      ),
      atomicState: fc.record({
        on: fc.dictionary(
          fc.string({ minLength: 1 }),
          fc.array(eventArbitrary, { maxLength: 3, depthIdentifier }),
          { maxKeys: 5 }
        ),
        always: fc.array(eventArbitrary, { maxLength: 3, depthIdentifier }),
        invoke: fc.array(
          fc.record({
            src: fc.string(),
            id: fc.string(),
            onDone: fc.oneof(
              { depthIdentifier },
              fc.constant(void 0),
              eventArbitrary
            ),
            onError: fc.oneof(
              { depthIdentifier },
              fc.constant(void 0),
              eventArbitrary
            ),
          }),
          {
            maxLength: 3,
            depthIdentifier,
          }
        ),
        entry: fc.array(fc.string(), { maxLength: 3, depthIdentifier }),
        exit: fc.array(fc.string(), { maxLength: 3, depthIdentifier }),
      }),
      compoundState: generateStates(tie("atomicState"), tie("state")),
      parallelState: generateStates(
        tie("atomicState"),
        tie("compoundState")
      ).chain((state) =>
        fc
          .oneof({ depthIdentifier }, fc.constant(void 0), eventArbitrary)
          .map((onDone) => ({
            ...state,
            type: "parallel",
            onDone,
          }))
      ),
      finalState: tie("atomicState").map((s) => ({
        ...(s as any),
        type: "final",
      })),
      historyState: tie("atomicState").map((s) => ({
        ...(s as any),
        type: "history",
      })),
    }));
    return arbitraryMachine;
  }

  generate(
    mrng: fc.Random,
    biasFactor: number | undefined
  ): fc.Value<AnyStateNodeConfig> {
    this.reset();
    const result = this.arbitrary.generate(mrng, biasFactor);
    this.reset();
    return result;
  }

  private reset() {
    this.usedStateNames.splice(0, this.usedStateNames.length);
    this.remainingStateNames = this.stateNames.slice(0, -1);
  }

  canShrinkWithoutContext(value: unknown): value is AnyStateNodeConfig {
    return this.arbitrary.canShrinkWithoutContext(value);
  }

  shrink(
    value: AnyStateNodeConfig,
    context?: unknown
  ): fc.Stream<fc.Value<AnyStateNodeConfig>> {
    this.reset();
    const result = this.arbitrary.shrink(value, context);
    return result.map((res) => {
      this.reset();
      return res;
    });
  }
}

export const arbitraryMachine: fc.Arbitrary<
  StateNodeConfig<any, any, any, any>
> = fc
  .uniqueArray(fc.string({ minLength: 1 }), { minLength: 1 })
  .chain((stateNames) => new MachineArbitrary(stateNames));
