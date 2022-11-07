import * as fc from "fast-check";
import { createMachine } from "xstate";
import { arbitraryMachine } from "../src/arbitrary-machine";
import { getAllTransitions } from "../src/get-all-transitions";

describe("getAllTransitions", () => {
  it("should return all transitions", () => {
    fc.assert(
      fc.property(arbitraryMachine, ({ machine, events }) => {
        const m = createMachine({
          ...machine,
          predictableActionArguments: true,
        });
        expect(new Set(getAllTransitions(m).map((e) => e.eventType))).toEqual(
          new Set(events)
        );
        return true;
      }),
      { numRuns: 1000 }
    );
  });
});
