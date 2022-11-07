import * as fc from "fast-check";
import { createMachine } from "xstate";
import { arbitraryMachine } from "../src/arbitrary-machine";
import { getAllConditions } from "../src/get-all-conditions";

describe("getAllConditions", () => {
  it("should return all conditions", () => {
    fc.assert(
      fc.property(arbitraryMachine, ({ machine, conditions }) => {
        const m = createMachine({
          ...machine,
          predictableActionArguments: true,
        });
        expect(new Set(getAllConditions(m).map((c) => c.name))).toEqual(
          new Set(conditions)
        );
        return true;
      }),
      { numRuns: 1000 }
    );
  });
});
