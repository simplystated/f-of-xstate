import * as fc from "fast-check";
import { createMachine } from "xstate";
import { arbitraryMachine } from "../src/arbitrary-machine";
import { getAllProperStates, getAllStates } from "../src/get-all-states";

describe("getAllStates", () => {
  it("should return all state ids", () => {
    fc.assert(
      fc.property(arbitraryMachine, ({ machine, states }) => {
        const m = createMachine({
          ...machine,
          predictableActionArguments: true,
        });
        expect(new Set(getAllStates(m).map((s) => s.id))).toEqual(
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          new Set(states.concat([machine.id!]))
        );
        return true;
      }),
      { numRuns: 1000 }
    );
  });
});

describe("getAllProperStates", () => {
  it("should return all state ids", () => {
    fc.assert(
      fc.property(arbitraryMachine, ({ machine, states }) => {
        const m = createMachine({
          ...machine,
          predictableActionArguments: true,
        });
        expect(new Set(getAllProperStates(m).map((s) => s.id))).toEqual(
          new Set(states)
        );
        return true;
      }),
      { numRuns: 1000 }
    );
  });
});
