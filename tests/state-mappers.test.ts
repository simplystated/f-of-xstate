import * as fc from "fast-check";
import { createMachine } from "xstate";
import { arbitraryMachine } from "../src/arbitrary-machine";
import { getAllTransitions } from "../src/get-all-transitions";
import { mapStates } from "../src/map-states";
import {
  appendActionsToAllTransitions,
  appendTransitions,
  filterTransitions,
} from "../src/state-mappers";

describe("stateMappers", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should add actions", () => {
    fc.assert(
      fc.property(arbitraryMachine, ({ machine, actions }) => {
        const m = createMachine({
          ...machine,
          predictableActionArguments: true,
        });
        const initialTransitions = getAllTransitions(m);

        const newAction = `newAction-${actions.join(";")}`;
        const mapped = mapStates(
          m,
          appendActionsToAllTransitions([{ type: newAction }])
        );
        const mappedMachine = createMachine({
          ...mapped,
          predictableActionArguments: true,
        });

        const transitions = getAllTransitions(mappedMachine);
        expect(new Set(transitions.map((t) => t.eventType))).toEqual(
          new Set(initialTransitions.map((t) => t.eventType))
        );

        transitions.forEach((transition) =>
          expect(
            transition.actions[transition.actions.length - 1].type
          ).toEqual(newAction)
        );

        return true;
      }),
      { numRuns: 1000 }
    );
  });

  it("should filter transitions", () => {
    fc.assert(
      fc.property(arbitraryMachine, ({ machine, events }) => {
        const m = createMachine({
          ...machine,
          predictableActionArguments: true,
        });
        const eventToKeep = events?.[0];

        const mapped = mapStates(
          m,
          filterTransitions((transition) => transition.event === eventToKeep)
        );
        const mappedMachine = createMachine({
          ...mapped,
          predictableActionArguments: true,
        });

        const transitions = getAllTransitions(mappedMachine);
        expect(new Set(transitions.map((t) => t.eventType))).toEqual(
          new Set(typeof eventToKeep === "undefined" ? [] : [eventToKeep])
        );

        return true;
      }),
      { numRuns: 500 }
    );
  });

  it("should append transitions", () => {
    fc.assert(
      fc.property(
        arbitraryMachine.filter(({ states }) => states.length > 0),
        ({ machine, states, events }) => {
          const m = createMachine({
            ...machine,
            predictableActionArguments: true,
          });

          const newEvent = `new-event-${events.join("-")}`;
          const newTarget = `#${states[0]}`;
          const newTransition = {
            event: newEvent,
            target: [newTarget],
            actions: [],
          };

          const mapped = mapStates(
            m,
            appendTransitions(() => [newTransition])
          );
          const mappedMachine = createMachine({
            ...mapped,
            predictableActionArguments: true,
          });

          const transitions = getAllTransitions(mappedMachine);
          expect(
            transitions.map((t) => ({
              event: t.eventType,
              target: t.target?.map((t) => `#${t.id}`),
              actions: [],
            }))
          ).toContainEqual(newTransition);

          return true;
        }
      ),
      { numRuns: 500 }
    );
  });
});
