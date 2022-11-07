import * as fc from "fast-check";
import { createMachine } from "xstate";
import { arbitraryMachine } from "../src/arbitrary-machine";
import { getAllStates } from "../src/get-all-states";

describe("getAllStates", () => {
  it("should return all state ids", () => {
    fc.assert(
      fc.property(arbitraryMachine, ({ machine, states }) => {
        const uniqueMachineId = `machine-${states.join("-")}`;
        const m = createMachine({
          id: uniqueMachineId,
          ...machine,
          predictableActionArguments: true,
        });
        expect(new Set(getAllStates(m).map((s) => s.key))).toEqual(
          new Set(states.concat([uniqueMachineId]))
        );
        return true;
      }),
      { numRuns: 1000 }
    );
  });
});
