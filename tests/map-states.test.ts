import * as fc from "fast-check";
import { createMachine } from "xstate";
import { arbitraryMachine } from "../src/arbitrary-machine";
import { getAllActions } from "../src/get-all-actions";
import { getAllConditions } from "../src/get-all-conditions";
import { getAllInvocations } from "../src/get-all-invocations";
import { getAllStates } from "../src/get-all-states";
import { getAllTransitions } from "../src/get-all-transitions";
import { mapStates } from "../src/map-states";

describe("mapStates", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should map all state ids", () => {
    const warn = jest.spyOn(global.console, "warn");
    const error = jest.spyOn(global.console, "error");

    fc.assert(
      fc.property(
        arbitraryMachine,
        ({ machine, states, events, actions, conditions }) => {
          const uniqueMachineId = `machine-${states.join("-")}`;
          const m = createMachine({
            ...machine,
            id: uniqueMachineId,
            predictableActionArguments: true,
          });
          const mapped = mapStates(m, (node) => ({
            ...node,
            invoke: [],
          }));
          const mappedMachine = createMachine({
            ...mapped,
            predictableActionArguments: true,
          });

          expect(getAllInvocations(mappedMachine)).toHaveLength(0);
          expect(new Set(getAllStates(mappedMachine).map((s) => s.id))).toEqual(
            new Set(states.concat([uniqueMachineId]))
          );
          expect(
            new Set(getAllActions(mappedMachine).map((a) => a.type))
          ).toEqual(new Set(actions));
          expect(
            new Set(getAllTransitions(mappedMachine).map((e) => e.eventType))
          ).toEqual(new Set(events));
          expect(
            new Set(getAllConditions(mappedMachine).map((e) => e.name))
          ).toEqual(new Set(conditions));

          // we don't want to create machine configs that has warnings from a machine config that didn't have warnings.
          expect(warn).not.toHaveBeenCalled();
          expect(error).not.toHaveBeenCalled();
          jest.clearAllMocks();

          return true;
        }
      ),
      { numRuns: 1000 }
    );
  });
});
