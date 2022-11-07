import * as fc from "fast-check";
import { createMachine, StateNode } from "xstate";
import { arbitraryMachine } from "../src/arbitrary-machine";

type AnyStateNode = StateNode<any, any, any, any, any, any>;

// console.log(JSON.stringify(fc.sample(arbitraryMachine, 3), null, 2));

describe("arbitraryMachine", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should generate valid machines", () => {
    const warn = jest.spyOn(global.console, "warn");
    const error = jest.spyOn(global.console, "error");

    fc.assert(
      fc.property(arbitraryMachine, (machine) => {
        const m = createMachine({
          ...machine,
          predictableActionArguments: true,
        }) as unknown as AnyStateNode;
        walkStateNodes(m, (node) => node.transitions);
        expect(warn).not.toHaveBeenCalled();
        expect(error).not.toHaveBeenCalled();
        jest.clearAllMocks();
        return true;
      }),
      { numRuns: 1000 }
    );
  });
});

const walkStateNodes = (
  stateNode: AnyStateNode,
  process: (stateNode: AnyStateNode) => void
) => {
  process(stateNode);
  Object.keys(stateNode.states ?? {}).forEach((state) =>
    walkStateNodes(stateNode.states[state], process)
  );
};
