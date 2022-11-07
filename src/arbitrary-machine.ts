import * as fc from "fast-check";
import type { StateNodeConfig } from "xstate";

const depthIdentifier = fc.createDepthIdentifier();

type AnyStateNodeConfig = StateNodeConfig<any, any, any, any>;

const stateNameArbitrary = fc
  .string({ minLength: 1 })
  .filter((s) => /^[^#\.]+$/.test(s));

const machineDescriptorArbitrary: fc.Arbitrary<StateDescriptor> = fc.letrec(
  (tie) => ({
    machine: fc.oneof(
      { maxDepth: 3, withCrossShrink: true, depthIdentifier },
      tie("atomicState"),
      tie("compoundState"),
      tie("parallelState")
    ),
    state: fc.oneof(
      { maxDepth: 3, withCrossShrink: true, depthIdentifier },
      tie("atomicState"),
      tie("finalState"),
      tie("historyState"),
      tie("compoundState"),
      tie("parallelState")
    ),
    atomicState: fc.tuple(
      fc.constant("atomic"),
      stateNameArbitrary,
      fc.constant([])
    ),
    compoundState: fc.tuple(
      fc.constant("compound"),
      stateNameArbitrary,
      fc.array(tie("state"), { maxLength: 5, depthIdentifier })
    ),
    parallelState: fc.tuple(
      fc.constant("parallel"),
      stateNameArbitrary,
      fc.array(tie("compoundState"), { maxLength: 5, depthIdentifier })
    ),
    finalState: fc.tuple(
      fc.constant("final"),
      stateNameArbitrary,
      fc.constant([])
    ),
    historyState: fc.tuple(
      fc.constant("history"),
      stateNameArbitrary,
      fc.constant([])
    ),
  })
).machine as fc.Arbitrary<any>;

type StateType = "atomic" | "compound" | "parallel" | "history" | "final";
type StateDescriptor = [StateType, string, Array<StateDescriptor>];
interface BaseStateConfig {
  type: StateType;
  id: string;
  states: Record<string, BaseStateConfig>;
}

// this is a weird hybrid of StateNodeDefinition and StateNodeConfig
interface StateConfig {
  type?: StateType;
  id?: string;
  states?: Record<string, StateConfig>;
  on?: Record<string, Array<EventConfig>>;
  always?: Array<EventConfig>;
  onDone?: Array<EventConfig>;
  data?: Function;
  invoke?: Array<InvokeConfig>;
}

interface InvokeConfig {
  id?: string;
  src: string;
}

interface EventConfig {
  eventType?: string;
  target?: string;
  actions: Array<string>;
  cond?: string;
  delay?: string;
}

const createStates = (
  path: Array<string>,
  pathsByStateNames: Map<string, { path: Array<string>; type: StateType }>,
  stateDescriptors: Array<StateDescriptor>
): Record<string, BaseStateConfig> =>
  stateDescriptors.reduce((states, [type, name, children]) => {
    const id = pathsByStateNames.has(name)
      ? `${name}${pathsByStateNames.size}`
      : name;
    pathsByStateNames.set(id, { path, type });
    const state = {
      type,
      id,
      states: createStates(path.concat(id), pathsByStateNames, children),
    };
    return {
      ...states,
      [id]: state,
    };
  }, {});

const eventArb = (stateIds: Array<string>) =>
  fc
    .oneof(
      { depthIdentifier },
      fc.constant(void 0),
      fc.constantFrom(...stateIds)
    )
    .chain((target) =>
      fc.record({
        eventType: fc.string({ minLength: 1 }),
        target:
          typeof target === "undefined"
            ? fc.constant(void 0)
            : fc.constant(`#${target}`),
        actions: fc.array(fc.string(), { maxLength: 3, depthIdentifier }),
        cond: fc.oneof(fc.constant(void 0), fc.string()),
        delay: fc.oneof(fc.constant(void 0), fc.string()),
      })
    );

const eventMapStateUpdate = (stateIds: Array<string>) =>
  eventArb(stateIds).map((event) => (state: StateConfig) => ({
    ...state,
    on: {
      ...state?.on,
      [event.eventType]: (state?.on?.hasOwnProperty(event.eventType)
        ? state.on[event.eventType]
        : []
      ).concat([event]),
    },
  }));

const alwaysStateUpdate = (stateIds: Array<string>) =>
  eventArb(stateIds).map((event) => (state: StateConfig) => {
    const { eventType, ...evt } = event;
    return {
      ...state,
      always: (state?.always ?? []).concat([evt]),
    };
  });

const onDoneStateUpdate = (stateIds: Array<string>) =>
  eventArb(stateIds).map((event) => (state: StateConfig) => {
    const { eventType, ...evt } = event;
    return {
      ...state,
      onDone: (state?.onDone ?? []).concat([evt]),
    };
  });

const doneDataStateUpdate = () =>
  fc
    .func(fc.dictionary(fc.string(), fc.jsonValue(), { maxKeys: 3 }))
    .map((data) => (state: StateConfig) => ({
      ...state,
      data,
    }));

const invokeStateUpdate = () =>
  fc
    .option(
      fc.record({
        src: fc.string(),
        id: fc.string(),
      })
    )
    .map((invoke) => (state: StateConfig) => ({
      ...state,
      invoke: (state.invoke ?? []).concat(invoke ? [invoke] : []),
    }));

const standardStateUpdate = (stateIds: Array<string>) =>
  fc.array(
    fc.oneof(
      eventMapStateUpdate(stateIds),
      alwaysStateUpdate(stateIds),
      invokeStateUpdate()
    ),
    { maxLength: 3, depthIdentifier }
  );

const atomicStateUpdate = (stateIds: Array<string>) =>
  standardStateUpdate(stateIds);

const compoundStateUpdate = (stateIds: Array<string>) =>
  standardStateUpdate(stateIds);

const parallelStateUpdate = (stateIds: Array<string>) =>
  fc.array(
    fc.oneof(
      eventMapStateUpdate(stateIds),
      alwaysStateUpdate(stateIds),
      invokeStateUpdate(),
      onDoneStateUpdate(stateIds)
    ),
    { maxLength: 3, depthIdentifier }
  );

const historyStateUpdate = (stateIds: Array<string>) => fc.constant([]);

const finalStateUpdate = (stateIds: Array<string>) =>
  fc
    .tuple(
      fc.option(doneDataStateUpdate()),
      fc.array(invokeStateUpdate(), { maxLength: 3, depthIdentifier })
    )
    .map(([done, invokes]) =>
      invokes.concat(!!done ? ([done] as any) : [])
    ) as fc.Arbitrary<Array<Update>>;

const stateUpdateForType = (stateIds: Array<string>, type: StateType) =>
  ({
    atomic: atomicStateUpdate,
    compound: compoundStateUpdate,
    parallel: parallelStateUpdate,
    history: historyStateUpdate,
    final: finalStateUpdate,
  }[type](stateIds));

type Update = (state: StateConfig) => StateConfig;

const applyInPath = (
  state: StateConfig,
  path: Array<string>,
  updates: Array<Update>
): StateConfig => {
  if (path.length > 0) {
    const nextState = path[0];
    return {
      ...state,
      states: {
        ...state.states,
        [nextState]: applyInPath(
          state.states![nextState],
          path.slice(1),
          updates
        ),
      },
    };
  }

  return updates.reduce((state, update) => update(state), state);
};

export const arbitraryMachine: fc.Arbitrary<AnyStateNodeConfig> = fc
  .array(machineDescriptorArbitrary, { minLength: 1 })
  .chain((stateDescriptors) => {
    const pathsByStateNames = new Map<
      string,
      { path: Array<string>; type: StateType }
    >();
    const states = createStates([], pathsByStateNames, stateDescriptors);
    const rootState = {
      states,
    };
    const stateIds = Array.from(pathsByStateNames.keys());

    return fc
      .tuple(
        ...Array.from(pathsByStateNames.values()).map(({ path, type }) => {
          return fc.tuple(
            fc.constant(path),
            stateUpdateForType(stateIds, type)
          );
        })
      )
      .map((pathsAndUpdates) => {
        return pathsAndUpdates.reduce(
          (rootState: StateConfig, [path, updates]) =>
            applyInPath(rootState, path, updates),
          rootState
        );
      })
      .map(({ onDone, ...machine }) => machine);
  }) as fc.Arbitrary<any>;
