import * as fc from "fast-check";
import { createMachine } from "xstate";
import { arbitraryMachine } from "../src/arbitrary-machine";
import { getAllInvocations } from "../src/get-all-invocations";

describe("getAllInvocations", () => {
  it("should return all invocations", () => {
    fc.assert(
      fc.property(arbitraryMachine, ({ machine, services }) => {
        const m = createMachine({
          ...machine,
          predictableActionArguments: true,
        });
        expect(new Set(getAllInvocations(m).map((c) => c.src))).toEqual(
          new Set(services)
        );
        return true;
      }),
      { numRuns: 1000 }
    );
  });
});
