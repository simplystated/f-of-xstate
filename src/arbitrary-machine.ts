import * as fc from "fast-check";
import type { StateNodeConfig } from "xstate";

const depthIdentifier = fc.createDepthIdentifier();

type AnyStateNodeConfig = StateNodeConfig<any, any, any, any>;

const stateNameArbitrary = fc
  .string({ minLength: 1 })
  .filter((s) => /^[^#\.]+$/.test(s));

const machineDescriptorArbitrary: fc.Arbitrary<StateDescriptor> = fc.letrec(
  (tie) => ({
    machine: fc
      .oneof(
        { maxDepth: 3, withCrossShrink: true, depthIdentifier },
        tie("atomicState"),
        tie("compoundState"),
        tie("parallelState")
      )
      .map(
        (([type, name, children]: StateDescriptor): StateDescriptor => [
          "machine",
          name,
          children,
        ]) as any
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

type StateType =
  | "machine"
  | "atomic"
  | "compound"
  | "parallel"
  | "history"
  | "final";
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
    state: {
      ...state,
      on: {
        ...state?.on,
        [event.eventType]: (state?.on?.hasOwnProperty(event.eventType)
          ? state.on[event.eventType]
          : []
        ).concat([event]),
      },
    },
    events: [event.eventType],
    conditions: event.cond ? [event.cond] : [],
    actions: event.actions,
  }));

const alwaysStateUpdate = (stateIds: Array<string>) =>
  eventArb(stateIds).map((event) => (state: StateConfig) => {
    const { eventType, ...evt } = event;
    return {
      state: {
        ...state,
        always: (state?.always ?? []).concat([evt]),
      },
      events: [""],
      conditions: evt.cond ? [evt.cond] : [],
      actions: evt.actions,
    };
  });

const onDoneStateUpdate = (stateIds: Array<string>) =>
  eventArb(stateIds).map((event) => (state: StateConfig) => {
    const { eventType, ...evt } = event;
    return {
      state: {
        ...state,
        onDone: (state?.onDone ?? []).concat([evt]),
      },
      events: [`done.state.${state.id}`],
      conditions: evt.cond ? [evt.cond] : [],
      actions: evt.actions,
    };
  });

const doneDataStateUpdate = () =>
  fc
    .func(fc.dictionary(fc.string(), fc.jsonValue(), { maxKeys: 3 }))
    .map((data) => (state: StateConfig) => ({
      state: {
        ...state,
        data,
      },
      events: [],
      conditions: [],
      actions: [],
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
      state: {
        ...state,
        invoke: (state.invoke ?? []).concat(invoke ? [invoke] : []),
      },
      events: [],
      conditions: [],
      actions: [],
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

// this is necessary because we don't allow onDone at the top level of a machine, even if it's a parallel state.
const machineStateUpdate = (stateIds: Array<string>) =>
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
    machine: machineStateUpdate,
  }[type](stateIds));

type Update = (state: StateConfig) => UpdateState;
interface UpdateState {
  state: StateConfig;
  events: Array<string>;
  conditions: Array<string>;
  actions: Array<string>;
}

const applyInPath = (
  updateState: UpdateState,
  path: Array<string>,
  updates: Array<Update>
): UpdateState => {
  if (path.length > 0) {
    const nextState = path[0];
    const {
      state: nextStateValue,
      events,
      conditions,
      actions,
    } = applyInPath(
      { ...updateState, state: updateState.state.states![nextState] },
      path.slice(1),
      updates
    );
    return {
      events,
      conditions,
      actions,
      state: {
        ...updateState.state,
        states: {
          ...updateState.state.states,
          [nextState]: nextStateValue,
        },
      },
    };
  }

  return updates.reduce((updateState, update) => {
    const next = update(updateState.state);
    return {
      state: next.state,
      events: updateState.events.concat(next.events),
      conditions: updateState.conditions.concat(next.conditions),
      actions: updateState.actions.concat(next.actions),
    };
  }, updateState);
};

export const arbitraryMachine: fc.Arbitrary<{
  machine: AnyStateNodeConfig;
  events: Array<string>;
  conditions: Array<string>;
  actions: Array<string>;
}> = fc
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
          (updateState: UpdateState, [path, updates]) =>
            applyInPath(updateState, path, updates),
          { state: rootState, events: [], conditions: [], actions: [] }
        );
      })
      .map(({ events, conditions, actions, state: machine }) => ({
        machine,
        events: dedup(events),
        conditions: dedup(conditions),
        actions: dedup(actions),
      }));
  }) as fc.Arbitrary<any>;

const dedup = <T>(items: Array<T>): Array<T> => Array.from(new Set(items));
