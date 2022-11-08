import * as fc from "fast-check";
import { createMachine } from "xstate";
import { arbitraryMachine } from "../src/arbitrary-machine";
import { getAllTransitions } from "../src/get-all-transitions";
import { mapStates } from "../src/map-states";
import { appendActionsToAllTransitions } from "../src/state-mappers";

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
});
