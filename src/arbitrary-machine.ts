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

/*export const arbitraryMachine: fc.Arbitrary<
  StateNodeConfig<any, any, any, any>
> = fc
  .uniqueArray(fc.string({ minLength: 1 }), { minLength: 1 })
  .chain((stateNames) => new MachineArbitrary(stateNames));
*/

const stateNameArbitrary = fc
  .string({ minLength: 1 })
  .filter((s) => /^[^#\.]+$/.test(s));

const machineDescriptorArbitrary: fc.Arbitrary<StateDescriptor> = fc.letrec(
  (tie) => ({
    machine: fc.oneof(
      { maxDepth: 3, withCrossShrink: true, depthIdentifier },
      tie("atomicState"),
      tie("compoundState"),
      tie("parallelState")
    ),
    state: fc.oneof(
      { maxDepth: 3, withCrossShrink: true, depthIdentifier },
      tie("atomicState"),
      tie("finalState"),
      tie("historyState"),
      tie("compoundState"),
      tie("parallelState")
    ),
    atomicState: fc.tuple(
      fc.constant("atomic"),
      stateNameArbitrary,
      fc.constant([])
    ),
    compoundState: fc.tuple(
      fc.constant("compound"),
      stateNameArbitrary,
      fc.array(tie("state"), { maxLength: 5, depthIdentifier })
    ),
    parallelState: fc.tuple(
      fc.constant("parallel"),
      stateNameArbitrary,
      fc.array(tie("compoundState"), { maxLength: 5, depthIdentifier })
    ),
    finalState: fc.tuple(
      fc.constant("final"),
      stateNameArbitrary,
      fc.constant([])
    ),
    historyState: fc.tuple(
      fc.constant("history"),
      stateNameArbitrary,
      fc.constant([])
    ),
  })
).machine as fc.Arbitrary<any>;

type StateType = "atomic" | "compound" | "parallel" | "history" | "final";
type StateDescriptor = [StateType, string, Array<StateDescriptor>];
interface BaseStateConfig {
  type: StateType;
  id: string;
  states: Record<string, BaseStateConfig>;
}

const createStates = (
  path: Array<string>,
  pathsByStateNames: Map<string, { path: Array<string>; type: StateType }>,
  stateDescriptors: Array<StateDescriptor>
): Record<string, BaseStateConfig> =>
  stateDescriptors.reduce((states, [type, name, children]) => {
    const id = pathsByStateNames.has(name)
      ? `${name}${pathsByStateNames.size}`
      : name;
    pathsByStateNames.set(id, { path, type });
    const state = {
      type,
      id,
      states: createStates(path.concat(id), pathsByStateNames, children),
    };
    return {
      ...states,
      [id]: state,
    };
  }, {});

const eventArb = (stateIds: Array<string>) =>
  fc
    .oneof(
      { depthIdentifier },
      fc.constant(void 0),
      fc.constantFrom(...stateIds)
    )
    .chain((target) =>
      fc.record({
        eventType: fc.string({ minLength: 1 }),
        target:
          typeof target === "undefined"
            ? fc.constant(void 0)
            : fc.constant(`#${target}`),
        actions: fc.array(fc.string(), { maxLength: 3, depthIdentifier }),
        cond: fc.oneof(fc.constant(void 0), fc.string()),
        delay: fc.string(),
      })
    )
    .map((event) => (state: any) => ({
      ...state,
      on: {
        ...state?.on,
        [event.eventType]: (state?.on?.hasOwnProperty(event.eventType)
          ? state.on[event.eventType]
          : []
        ).concat([event]),
      },
    }));

const atomicStateUpdate = (stateIds: Array<string>) =>
  fc.array(eventArb(stateIds), { maxLength: 3, depthIdentifier });

const compoundStateUpdate = (stateIds: Array<string>) =>
  fc.array(eventArb(stateIds), { maxLength: 3, depthIdentifier });

const parallelStateUpdate = (stateIds: Array<string>) =>
  fc.array(eventArb(stateIds), { maxLength: 3, depthIdentifier });

const historyStateUpdate = (stateIds: Array<string>) =>
  fc.array(eventArb(stateIds), { maxLength: 3, depthIdentifier });

const finalStateUpdate = (stateIds: Array<string>) =>
  fc.array(eventArb(stateIds), { maxLength: 3, depthIdentifier });

const stateUpdateForType = (stateIds: Array<string>, type: StateType) =>
  ({
    atomic: atomicStateUpdate,
    compound: compoundStateUpdate,
    parallel: parallelStateUpdate,
    history: historyStateUpdate,
    final: finalStateUpdate,
  }[type](stateIds));

const applyInPath = (
  state: any,
  path: Array<string>,
  updates: Array<any>
): Record<string, any> => {
  if (path.length > 0) {
    const nextState = path[0];
    return {
      ...state,
      states: {
        ...state.states,
        [nextState]: applyInPath(
          state.states[nextState] as any,
          path.slice(1),
          updates
        ),
      },
    };
  }

  return updates.reduce((state, update) => update(state), state);
};

export const arbitraryMachine: fc.Arbitrary<AnyStateNodeConfig> = fc
  .array(machineDescriptorArbitrary, { minLength: 1 })
  .chain((stateDescriptors) => {
    const pathsByStateNames = new Map<
      string,
      { path: Array<string>; type: StateType }
    >();
    const states = createStates([], pathsByStateNames, stateDescriptors);
    const rootState = {
      states,
    };
    const stateIds = Array.from(pathsByStateNames.keys());

    return fc
      .tuple(
        ...Array.from(pathsByStateNames.values()).map(({ path, type }) => {
          return fc.tuple(
            fc.constant(path),
            stateUpdateForType(stateIds, type)
          );
        })
      )
      .map((pathsAndUpdates) => {
        return pathsAndUpdates.reduce(
          (rootState: any, [path, updates]) =>
            applyInPath(rootState, path, updates),
          rootState
        );
      });
  }) as fc.Arbitrary<any>;
