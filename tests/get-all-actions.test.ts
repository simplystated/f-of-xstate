import * as fc from "fast-check";
import { createMachine } from "xstate";
import { arbitraryMachine } from "../src/arbitrary-machine";
import { getAllActions } from "../src/get-all-actions";

describe("getAllActions", () => {
  it("should return all actions", () => {
    fc.assert(
      fc.property(arbitraryMachine, ({ machine, actions }) => {
        const m = createMachine({
          ...machine,
          predictableActionArguments: true,
        });
        expect(new Set(getAllActions(m).map((a) => a.type))).toEqual(
          new Set(actions)
        );
        return true;
      }),
      { numRuns: 1000 }
    );
  });
});
