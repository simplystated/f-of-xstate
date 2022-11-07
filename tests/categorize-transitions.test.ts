import * as fc from "fast-check";
import { createMachine, TransitionDefinition } from "xstate";
import { arbitraryMachine } from "../src/arbitrary-machine";
import {
  categorizeTransitions,
  isAlwaysTransition,
  isDelayedTransition,
  isEventTransition,
  isInvocationDoneTransition,
  isInvocationErrorTransition,
  isStateDoneTransition,
  isWildcardTransition,
  TransitionsByCategory,
} from "../src/categorize-transitions";
import { getAllTransitions } from "../src/get-all-transitions";
import { AnyStateNodeConfig } from "../xstate-utils";

describe("categorizeTransitions", () => {
  it("should return all transitions", () => {
    fc.assert(
      fc.property(arbitraryMachine, ({ machine }) => {
        const m = createMachine({
          ...machine,
          predictableActionArguments: true,
        });
        const transitions = getAllTransitions(m);
        const categories = categorizeTransitions(transitions);
        expect(
          new Set(
            categories.always
              .concat(categories.delayDone)
              .concat(categories.eventOccurred)
              .concat(categories.invocationDone.map((i) => i.transition))
              .concat(categories.invocationError.map((i) => i.transition))
              .concat(categories.stateDone.map((s) => s.transition))
              .concat(categories.wildcard)
          )
        ).toEqual(new Set(transitions));
        return true;
      })
    );
  });

  it("should recognize mutations to always transitions", () => {
    fc.assert(
      fc.property(arbitraryMachine, ({ machine, states }) => {
        return testMutationProperty(
          machine,
          states,
          isAlwaysTransition,
          ({ always, ...machine }) => ({
            ...machine,
            always: ((always as Array<any>) ?? []).slice(0, -1),
          }),
          ({ always, ...machine }, target) => ({
            ...machine,
            always: ((always as Array<any>) ?? []).concat([
              { target: `#${target}` },
            ]),
          }),
          "always"
        );
      })
    );
  });

  it("should recognize mutations to wildcard transitions", () => {
    fc.assert(
      fc.property(arbitraryMachine, ({ machine, states }) => {
        return testMutationProperty(
          machine,
          states,
          isWildcardTransition,
          ({ on, ...machine }) => {
            return {
              ...machine,
            };
          },
          ({ on, ...machine }, target) => ({
            ...machine,
            on: {
              ...on,
              "*": ((on as any)?.["*"] ?? []).concat([
                { target: `#${target}` },
              ]),
            },
          }),
          "wildcard"
        );
      })
    );
  });

  it("should recognize mutations to eventOccurred transitions", () => {
    fc.assert(
      fc.property(arbitraryMachine, ({ machine, states }) => {
        return testMutationProperty(
          machine,
          states,
          isEventTransition,
          ({ on, ...machine }) => {
            return {
              ...machine,
            };
          },
          ({ on, ...machine }, target) => ({
            ...machine,
            on: {
              ...on,
              anEvent: ((on as any)?.["*"] ?? []).concat([
                { target: `#${target}` },
              ]),
            },
          }),
          "eventOccurred"
        );
      })
    );
  });

  it("should recognize mutations to delayDone transitions", () => {
    fc.assert(
      fc.property(arbitraryMachine, ({ machine, states }) => {
        return testMutationProperty(
          machine,
          states,
          isDelayedTransition,
          ({ after, on, ...machine }) => {
            return {
              ...machine,
            };
          },
          ({ after, ...machine }, target) => ({
            ...machine,
            after: {
              ...after,
              timeout: ((after as any)?.["timeout"] ?? []).concat([
                { target: `#${target}` },
              ]),
            },
          }),
          "delayDone"
        );
      })
    );
  });

  it("should recognize mutations to invocationDone transitions", () => {
    fc.assert(
      fc.property(arbitraryMachine, ({ machine, states }) => {
        return testMutationProperty(
          machine,
          states,
          isInvocationDoneTransition,
          ({ invoke, ...machine }) => {
            return {
              ...machine,
            };
          },
          ({ invoke, ...machine }, target) => ({
            ...machine,
            invoke: ((invoke as any) ?? []).concat({
              src: "service",
              id: "id",
              onDone: `#${target}`,
            }),
          }),
          "invocationDone"
        );
      })
    );
  });

  it("should recognize mutations to invocationError transitions", () => {
    fc.assert(
      fc.property(arbitraryMachine, ({ machine, states }) => {
        return testMutationProperty(
          machine,
          states,
          isInvocationErrorTransition,
          ({ invoke, ...machine }) => {
            return {
              ...machine,
            };
          },
          ({ invoke, ...machine }, target) => ({
            ...machine,
            invoke: ((invoke as any) ?? []).concat({
              src: "service",
              id: "id",
              onError: `#${target}`,
            }),
          }),
          "invocationError"
        );
      })
    );
  });

  it("should recognize mutations to stateDone transitions", () => {
    fc.assert(
      fc.property(arbitraryMachine, ({ machine, states }) => {
        return testMutationProperty(
          machine,
          states,
          isStateDoneTransition,
          ({ states, ...machine }) => {
            // TODO: this is a bit cheap
            return {
              ...machine,
            };
          },
          ({ states, ...machine }, target) => ({
            ...machine,
            states: {
              ...states,
              extraState: {
                ...states?.["extraState"],
                onDone: `#${target}`,
              },
            },
          }),
          "stateDone"
        );
      })
    );
  });
});

const testMutationProperty = (
  machine: AnyStateNodeConfig,
  states: Array<string>,
  transitionFilter: (t: TransitionDefinition<any, any>) => boolean,
  removeSomeTransitions: (machine: AnyStateNodeConfig) => AnyStateNodeConfig,
  appendNewTransition: (
    machine: AnyStateNodeConfig,
    target: string
  ) => AnyStateNodeConfig,
  category: keyof TransitionsByCategory<any, any>
): boolean => {
  const m = createMachine({
    ...machine,
    predictableActionArguments: true,
  });
  const initialCategories = categorizeTransitions(getAllTransitions(m));

  const existingTargets = m.transitions
    .filter(transitionFilter)
    .flatMap((t) => t.target?.map((t) => t.id))
    .filter((x) => !!x) as Array<string>;

  const unusedTargets = setDifference(states, existingTargets);

  if (unusedTargets.length === 0) {
    if (existingTargets.length === 0) {
      // we have nothing to remove...
      return true;
    }

    // try removing an event
    const m2 = createMachine({
      ...removeSomeTransitions(machine),
      predictableActionArguments: true,
    });

    const newCategories = categorizeTransitions(getAllTransitions(m2));
    expect(newCategories[category].length).toBeLessThan(
      initialCategories[category].length
    );
  } else {
    // try adding an event
    const m2 = createMachine({
      ...appendNewTransition(machine, unusedTargets[0]),
      predictableActionArguments: true,
    });

    const newCategories = categorizeTransitions(getAllTransitions(m2));
    expect(newCategories[category].length).toBeGreaterThan(
      initialCategories[category].length
    );
  }

  return true;
};

const setDifference = (universe: Array<string>, toRemove: Array<string>) => {
  const remSet = new Set(toRemove);
  return universe.filter((i) => !remSet.has(i));
};
