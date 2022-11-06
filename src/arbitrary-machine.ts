import * as fc from "fast-check";
import type { StateNodeConfig } from "xstate";

const depthIdentifier = fc.createDepthIdentifier();

export const arbitraryMachine: fc.Arbitrary<
  [StateNodeConfig<any, any, any, any>, string[]]
> = fc
  .uniqueArray(fc.string({ minLength: 1 }), { minLength: 1 })
  .chain((stateNames) => {
    let usedStateNames: string[] = [];
    let remainingStateNames = stateNames.slice(0, -1);
    const consumingStateArbitrary = fc
      .integer({ min: 0, max: stateNames.length })
      .map((n) => {
        const idx =
          ((n % remainingStateNames.length) + remainingStateNames.length) %
          remainingStateNames.length;
        const stateName = remainingStateNames.splice(idx, 1)[0];
        usedStateNames.push(stateName);
        return stateName;
      });
    const usedStateNameArbitrary = fc
      .integer({ min: 0, max: stateNames.length })
      .map((n) => {
        const idx =
          ((n % usedStateNames.length) + usedStateNames.length) %
          usedStateNames.length;
        return usedStateNames[idx];
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
      compoundState: tie("atomicState").chain((baseState) => {
        return fc
          .array(fc.tuple(consumingStateArbitrary, tie("state")), {
            maxLength: Math.min(remainingStateNames.length, 5),
          })
          .map((states) =>
            states.reduce(
              (states, [stateName, state]) => ({
                ...states,
                [stateName]: {
                  ...(state as any),
                  id: stateName,
                },
              }),
              {}
            )
          )
          .map((states) => ({
            ...(baseState as any),
            states,
          }));
      }),
      parallelState: fc.record({
        type: fc.constant("parallel"),
        onDone: fc.oneof(
          { depthIdentifier },
          fc.constant(void 0),
          eventArbitrary
        ),
        states: fc.dictionary(fc.string(), tie("compoundState"), {
          maxKeys: 5,
        }),
      }),
      finalState: tie("atomicState").map((s) => ({
        ...(s as any),
        type: "final",
      })),
      historyState: tie("atomicState").map((s) => ({
        ...(s as any),
        type: "history",
      })),
    }));
    return arbitraryMachine.map((machine) => {
      const consumedStateNames = usedStateNames;
      remainingStateNames = stateNames;
      usedStateNames = [];
      return [machine, consumedStateNames, stateNames];
    });
  }) as fc.Arbitrary<any>;
