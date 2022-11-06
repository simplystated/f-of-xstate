import * as fc from "fast-check";
import type { StateNodeConfig } from "xstate";

const depthIdentifier = fc.createDepthIdentifier();

export const arbitraryMachine: fc.Arbitrary<
  StateNodeConfig<any, any, any, any>
> = fc
  .uniqueArray(fc.string({ minLength: 1 }), { minLength: 1 })
  .chain((stateNames) => {
    const eventArbitrary = fc.record({
      target: fc.oneof(fc.constant(void 0), fc.constantFrom(stateNames)),
      actions: fc.array(fc.string(), { maxLength: 3, depthIdentifier }),
      cond: fc.option(fc.string()),
      delay: fc.string(),
    });
    let { machine: arbitraryMachine } = fc.letrec((tie) => ({
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
      atomicState: fc.record({
        on: fc.dictionary(
          fc.string(),
          fc.array(eventArbitrary, { maxLength: 3, depthIdentifier }),
          { maxKeys: 5 }
        ),
        always: fc.array(eventArbitrary, { maxLength: 3, depthIdentifier }),
        invoke: fc.array(fc.record({ src: fc.string(), id: fc.string() }), {
          maxLength: 3,
          depthIdentifier,
        }),
        entry: fc.array(fc.string(), { maxLength: 3, depthIdentifier }),
        exit: fc.array(fc.string(), { maxLength: 3, depthIdentifier }),
      }),
      compoundState: tie("atomicState").chain((state) => {
        return fc
          .record({
            states: fc.dictionary(
              fc.constantFrom(...stateNames),
              tie("state"),
              { maxKeys: 5 }
            ),
          })
          .map((extra) => ({ ...(state as any), ...(extra as any) }));
      }),
      parallelState: fc.record({
        type: fc.constant("parallel"),
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
    return arbitraryMachine;
  }) as fc.Arbitrary<any>;
