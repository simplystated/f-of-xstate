import * as fc from "fast-check";
import {
  assign,
  createMachine,
  interpret,
  MachineConfig,
  StateNodeConfig,
} from "xstate";
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
          const m = createMachine({
            ...machine,
            predictableActionArguments: true,
          });
          const mapped = mapStates(m, (node) => ({ ...node, invoke: [] }));
          const mappedMachine = createMachine({
            ...mapped,
            predictableActionArguments: true,
          });

          expect(getAllInvocations(mappedMachine)).toHaveLength(0);
          expect(new Set(getAllStates(mappedMachine).map((s) => s.id))).toEqual(
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            new Set(states.concat([machine.id!]))
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
          try {
            expect(warn).not.toHaveBeenCalled();
            expect(error).not.toHaveBeenCalled();
          } finally {
            jest.clearAllMocks();
          }

          return true;
        }
      ),
      { numRuns: 1000 }
    );
  });

  it("should provide correct paths", () => {
    fc.assert(
      fc.property(arbitraryMachine, ({ machine, states }) => {
        const m = createMachine({
          ...machine,
          predictableActionArguments: true,
        });
        const parentByChild = new Map<string, string | null>();
        const _ = mapStates(m, (node, path) => {
          parentByChild.set(
            node.id,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            path.length > 0 ? path[path.length - 1].id! : null
          );
          return node;
        });

        expect(parentByChild.size).toEqual(states.length + 1); // +1 b/c of the root machine state

        const allStates = getAllStates(m);

        for (const state of allStates) {
          const parentId = state.id;

          for (const child of Object.values(state.states)) {
            const nodeChild = child as StateNodeConfig<any, any, any>;
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(parentByChild.get(nodeChild.id!)).toEqual(parentId);
          }
        }

        return true;
      }),
      { numRuns: 500 }
    );
  });

  it("should provide correct targets and target ids", () => {
    const warn = jest.spyOn(global.console, "warn");
    const error = jest.spyOn(global.console, "error");

    fc.assert(
      fc.property(arbitraryMachine, ({ machine }) => {
        const m = createMachine({
          ...machine,
          predictableActionArguments: true,
        });
        const mapped = mapStates(m, (node) => {
          node.transitions.forEach((transition) =>
            expect(transition.target.join(",")).toEqual(
              transition.targetIds.map((i) => `#${i}`).join(",")
            )
          );
          return node;
        });
        createMachine({
          ...mapped,
          predictableActionArguments: true,
        });

        // we don't want to create machine configs that has warnings from a machine config that didn't have warnings.
        try {
          expect(warn).not.toHaveBeenCalled();
          expect(error).not.toHaveBeenCalled();
        } finally {
          jest.clearAllMocks();
        }

        return true;
      }),
      { numRuns: 500 }
    );
  });
});

describe("comprehensive example", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should work with identity mapper", async () => {
    const warn = jest.spyOn(global.console, "warn");
    const error = jest.spyOn(global.console, "error");

    const machineConfig = {
      predictableActionArguments: true,
      initial: "a",
      states: {
        a: {
          on: {
            next: {
              target: "a2",
              actions: "doSomething",
              cond: () => true,
            },
          },
        },
        a2: {
          entry: "doSomething",
          always: [
            { target: "b", cond: "isTrue" },
            { target: "c", cond: () => false },
          ],
        },
        b: {
          type: "parallel",
          onDone: "c",
          exit: "doSomethingElse",
          states: {
            b_1: {
              initial: "b_1_a",
              states: {
                b_1_a: {
                  on: {
                    "*": {
                      target: "b_1_b",
                      actions: assign({
                        hello: "world",
                      }),
                    },
                  },
                },
                b_1_b: {
                  type: "final",
                },
              },
            },
            b_2: {
              initial: "b_2_a",
              states: {
                b_2_a: {
                  on: {
                    next: "b_2_b",
                  },
                },
                b_2_b: {
                  on: {
                    next: "b_2_c",
                  },
                },
                b_2_c: {
                  type: "final",
                },
              },
            },
          },
        },
        c: {
          entry: {
            type: "validateMeta",
            meta: {
              hello: "there",
            },
          },
          after: {
            2: {
              target: "d",
              actions: assign({
                hi: "world",
              }),
            },
          },
        },
        d: {
          invoke: {
            src: () => new Promise((resolve) => resolve("hi")),
            onDone: "e",
          },
        },
        e: {
          invoke: {
            src: "promise",
            onError: "f",
          },
        },
        f: {},
      },
    } as MachineConfig<any, any, any>;

    const machine = createMachine(
      mapStates(createMachine(machineConfig).withContext({}), (node) => node)
    );

    const doSomethingAction = jest.fn();
    const doSomethingElseAction = jest.fn();
    const failedPromiseService = jest.fn(
      () => new Promise((_, reject) => reject("bad"))
    );
    const validateMetaAction = jest.fn(
      (_ctx: any, _evt: any, meta: any) => meta.action.meta.hello === "there"
    );

    const service = interpret(
      machine.withConfig({
        services: {
          promise: failedPromiseService,
        },
        actions: {
          doSomething: doSomethingAction,
          doSomethingElse: doSomethingElseAction,
          validateMeta: validateMetaAction,
        },
        guards: {
          isTrue: () => true,
        },
      })
    ).start();

    for (let i = 0; i < 10; ++i) {
      service.send("next");
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(service.getSnapshot().matches("f")).toBe(true);

    expect(doSomethingAction).toHaveBeenCalledTimes(2);
    expect(doSomethingElseAction).toHaveBeenCalledTimes(1);
    expect(failedPromiseService).toHaveBeenCalledTimes(1);
    expect(validateMetaAction).toHaveBeenCalledTimes(1);
    expect(validateMetaAction).toHaveLastReturnedWith(true);

    try {
      expect(warn).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    } finally {
      jest.clearAllMocks();
    }
  });

  it("should work with child states returned by the mapper", async () => {
    const warn = jest.spyOn(global.console, "warn");
    const error = jest.spyOn(global.console, "error");

    const machineConfig = {
      predictableActionArguments: true,
      id: "m",
      initial: "a",
      states: {
        a: {
          on: {
            next: {
              target: ".a2",
            },
          },
          states: {
            a2: {},
          },
        },
      },
    } as MachineConfig<any, any, any>;

    const machine = createMachine(
      mapStates(createMachine(machineConfig).withContext({}), (node) => ({
        ...node,
        states:
          node.id === "m"
            ? void 0
            : {
                subState: {},
              },
      }))
    );

    expect(new Set(getAllStates(machine).map((s) => s.id))).toEqual(
      new Set(["m", "m.a", "m.a.a2", "m.a.subState", "m.a.a2.subState"])
    );

    try {
      expect(warn).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    } finally {
      jest.clearAllMocks();
    }
  });
});
