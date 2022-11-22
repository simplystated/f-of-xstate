import {
  ActionObject,
  EventObject,
  Guard,
  InvokeDefinition,
  MachineConfig,
  MachineOptions,
  StateMachine,
  StateNodeConfig,
  StateNodeDefinition,
  StateSchema,
  StateValue,
  TransitionConfig,
  TransitionDefinition,
} from "xstate";

const transitionDefinitionToStructuredSourceConfig = <
  TContext,
  TEvent extends EventObject
>(
  transition: TransitionDefinition<TContext, TEvent>
): StructuredTransitionConfig<TContext, TEvent> => ({
  event: transition.eventType as any,
  actions: transition.actions,
  cond: transition.cond,
  description: transition.description,
  in: transition.in,
  internal: transition.internal,
  meta: transition.meta,
  // we are mapping over our state nodes so we cannot leave old
  // state nodes in our target. just use their ids.
  target: transition.target?.map((target) => `#${target.id}`) ?? [],
  // but make it easy to access the actual id of the target
  targetIds: transition.target?.map((target) => target.id) ?? [],
});

/**
 * The input type provided to a state mapper.
 * This type is similar to an XState StateNodeDefinition but removes redundant information
 * and provides data better suited to modification.
 * For example, instead of `on` and `always`, we only provide a `transitions` property, which is
 * always an array of {@link StructuredTransitionConfig}s.
 */
export type StructuredSourceStateNodeConfig<
  TContext,
  TStateSchema extends StateSchema<any>,
  TEvent extends EventObject
> = Pick<
  StateNodeDefinition<TContext, TStateSchema, TEvent>,
  | "data"
  | "description"
  | "entry"
  | "exit"
  | "history"
  | "id"
  | "initial"
  | "key"
  | "meta"
  | "order"
  | "tags"
  | "type"
  | "invoke"
> & {
  transitions: Array<StructuredTransitionConfig<TContext, TEvent>>;
  readonly stateDefinitions: Readonly<
    Record<string, StateNodeDefinition<TContext, TStateSchema, TEvent>>
  >;
};

/**
 * The output type expected of a state mapper.
 *
 * All `StructuredSourceStateNodeConfig`s are acceptable as `StructuredTransformedStateNodeConfig`s
 * but the intention is that mappers will make some modifications to the returned value.
 *
 * NOTE: mappers may only *add* states via the `states` property.
 */
export type StructuredTransformedStateNodeConfig<
  TContext,
  TStateSchema extends StateSchema<any>,
  TEvent extends EventObject
> = Omit<
  StructuredSourceStateNodeConfig<TContext, TStateSchema, TEvent>,
  "stateDefinitions" | "transitions"
> & {
  states?: Record<
    string,
    Partial<
      StructuredTransformedStateNodeConfig<TContext, TStateSchema, TEvent>
    >
  >;
  transitions: Array<StructuredTransformedTransitionConfig<TContext, TEvent>>;
};

/**
 * A hybrid between an XState `TransitionConfig` and a `TransitionDefinition`.
 * `TransitionDefinition`s are unsuitable for mapping operations because they
 * represent targets (and sources) as StateNodes, which are likely about to be
 * changed. Instead, we ensure targets are represented as state id references
 * and we remove sources, which are obvious from context.
 */
export interface StructuredTransitionConfig<
  TContext,
  TEvent extends EventObject
> extends TransitionConfig<TContext, TEvent> {
  /** The type of the event that will trigger this transition. */
  event: TEvent["type"];
  /** The condtion, if any guarding this transition. */
  cond?: Guard<TContext, TEvent>;
  /** The actions to execute while taking this transition. */
  actions: Array<ActionObject<TContext, TEvent>>;
  /** The in-state guard guarding this transition. */
  in?: StateValue;
  /** Is this an internal transition. */
  internal?: boolean;
  /** The array of target state references (e.g. "#(machine).myState"). */
  target: Array<string>;
  /** The array of target state ids (e.g. "(machine).myState"). */
  targetIds: Array<string>;
  /** The metadata associated with this transition. */
  meta?: Record<string, any>;
  /** The description associated with this transition. */
  description?: string;
}

export type StructuredTransformedTransitionConfig<
  TContext,
  TEvent extends EventObject
> = Omit<StructuredTransitionConfig<TContext, TEvent>, "targetIds">;

const toStructuredSourceStateNodeConfig = <
  TContext,
  TStateSchema extends StateSchema<any>,
  TEvent extends EventObject
>(
  state: StateNodeDefinition<TContext, TStateSchema, TEvent>
): StructuredSourceStateNodeConfig<TContext, TStateSchema, TEvent> => ({
  data: state.data,
  description: state.description,
  entry: state.entry,
  exit: state.exit,
  history: state.history,
  id: state.id,
  initial: state.initial,
  invoke: state.invoke,
  key: state.key,
  meta: state.meta,
  transitions: state.transitions.map(
    transitionDefinitionToStructuredSourceConfig
  ),
  order: state.order,
  stateDefinitions: state.states as any,
  tags: state.tags,
  type: state.type,
});

/**
 * Mapper function used by {@link mapStates} to map a
 * {@link StructuredSourceStateNodeConfig} and a {@link StatePath}
 * to an updated {@link StructuredTransformedStateNodeConfig}.
 *
 * Implementations should likely have lots of `...`s and `concat`s to 
 * ensure that you are preserving the parts of the source state
 * that you aren't direclty modifying.

 * `node`: An {@link StructuredSourceStateNodeConfig} representing the
 * current state .
 * 
 * `statePath`:
 *           1
 *        2      3
 *     4             6
 *
 * Imagining the numbers above as states,
 * when processing node "4" in the tree above, paths will be [mapper(node 1), mapper(node 2)].
 */
export type MapStatesMapper<
  TContext,
  TStateSchema extends StateSchema<any>,
  TEvent extends EventObject
> = (
  node: StructuredSourceStateNodeConfig<TContext, TStateSchema, TEvent>,
  statePath: StatePath<
    StructuredTransformedStateNodeConfig<TContext, TStateSchema, TEvent>
  >
) => StructuredTransformedStateNodeConfig<TContext, TStateSchema, TEvent>;

/**
 * Construct a new `StateNodeConfig` (suitable for passing to `createMachine`)
 * by walking an existing `StateMachine` (e.g. the output of `createMachine`)
 * and replacing each state with the output of the supplied `mapper` applied
 * to that state.
 *
 * @example
 * Update state metadata:
 * ```
 * import { createMachine } from "xstate";
 * import { mapStates } from "@simplystated/f-of-xstate";
 * const machine = createMachine(...);
 * const config = mapStatesFromDefinition(
 *   machine,
 *   (state) => ({
 *     ...state,
 *     meta: {
 *       ...state.meta,
 *       stateId: state.id
 *     }
 *   })
 * );
 * const updatedMachine = createMachine(config);
 * ```
 *
 * @param root StateMachine or StateNode to map over.
 * @param mapper Function that maps the existing node and
 * a state path to a possibly-updated new state.
 *
 * Generally, `mapper` should return a modified copy of the provided state.
 * E.g. with `(state) => ({ ...state, modifications: "here" })`
 * You should likely have lots of `...`s and `concat`s to
 * ensure that you are preserving the parts of the source state
 * that you aren't direclty modifying.
 *
 * @see {@link MapStatesMapper}.
 *
 * @returns The new `MachineConfig` resulting from applying `mapper`
 * to each state.
 */
export const mapStates = <
  TContext,
  TStateSchema extends StateSchema<any>,
  TEvent extends EventObject
>(
  root: StateMachine<TContext, TStateSchema, TEvent>,
  mapper: MapStatesMapper<TContext, TStateSchema, TEvent>
): MachineConfig<TContext, TStateSchema, TEvent> => {
  const machineDefinition = mapStatesFromDefinition(
    root.options,
    root.definition,
    mapper
  );
  return {
    ...machineDefinition,
    context: root.context as any,
    predictableActionArguments: root.config.predictableActionArguments,
    preserveActionOrder: root.config.preserveActionOrder,
  };
};

/**
 * Most users will prefer to use {@link mapStates}.
 * Only use `mapStatesFromDefinition` if you already have a StateNodeDefinition.
 *
 * @param machineOptions `MachineOptions` for the definition.
 * @param definition StateNodeDefinition to map over.
 * @param mapper Function that maps the existing node and
 * a state path to a possibly-updated new state.

 * Generally, `mapper` should return a modified copy of the provided state.
 * E.g. with `(state) => ({ ...state, modifications: "here" })`
 * You should likely have lots of `...`s and `concat`s to 
 * ensure that you are preserving the parts of the source state
 * that you aren't direclty modifying.
 *
 * @see {@link MapStatesMapper}.
 * 
 * @returns The new `StateNodeConfig` resulting from applying `mapper`
 * to each state.
 */
export const mapStatesFromDefinition = <
  TContext,
  TStateSchema extends StateSchema<any>,
  TEvent extends EventObject
>(
  machineOptions: MachineOptions<TContext, TEvent>,
  definition: StateNodeDefinition<TContext, TStateSchema, TEvent>,
  mapper: MapStatesMapper<TContext, TStateSchema, TEvent>
): StateNodeConfig<TContext, TStateSchema, TEvent> =>
  mapStatesWithPathFromDefinition(
    machineOptions,
    definition,
    [],
    mapper
  ) as any;

/**
 * The path of states from the root to the current node.
 */
export type StatePath<R extends StateNodeConfig<any, any, any>> = Array<R>;

const invokeDefinitionToConfig = <TContext, TEvent extends EventObject>(
  machineOptions: MachineOptions<TContext, TEvent>,
  invokeDefinition: InvokeDefinition<TContext, TEvent>
) => {
  const src =
    typeof invokeDefinition.src === "string"
      ? invokeDefinition.src
      : invokeDefinition.src.type;
  return {
    ...invokeDefinition,
    src: (machineOptions.services?.[src] as any) ?? src,
  };
};

const adaptStructuredStateNodeConfig = <
  TContext,
  TStateSchema extends StateSchema<any>,
  TEvent extends EventObject
>(
  machineOptions: MachineOptions<TContext, TEvent>,
  state: StructuredTransformedStateNodeConfig<TContext, TStateSchema, TEvent>
): StateNodeConfig<TContext, TStateSchema, TEvent> => {
  const [on, always]: [
    Array<StructuredTransitionConfig<TContext, TEvent>>,
    Array<StructuredTransitionConfig<TContext, TEvent>>
  ] = state.transitions.reduce(
    ([on, always], transition) => {
      return transition.event === ""
        ? [on, (always as any).concat([transition])]
        : [(on as any).concat([transition]), always];
    },
    [[], []]
  );

  return {
    ...state,
    invoke: state.invoke.map((invoke) =>
      invokeDefinitionToConfig(machineOptions, invoke)
    ),
    on,
    always,
  } as any;
};

const mapStatesWithPathFromDefinition = <
  TContext,
  TStateSchema extends StateSchema<any>,
  TEvent extends EventObject
>(
  machineOptions: MachineOptions<TContext, TEvent>,
  definition: StateNodeDefinition<TContext, TStateSchema, TEvent>,
  path: Array<
    StructuredTransformedStateNodeConfig<TContext, TStateSchema, TEvent>
  >,
  mapper: MapStatesMapper<TContext, TStateSchema, TEvent>
): StateNodeConfig<TContext, TStateSchema, TEvent> => {
  const mapped = mapper(toStructuredSourceStateNodeConfig(definition), path);

  const config = adaptStructuredStateNodeConfig(machineOptions, mapped);
  const newPath = path.concat(mapped);

  const newState = config;

  newState.states = Object.keys(definition.states).reduce(
    (states, key) => ({
      ...states,
      [key]: mapStatesWithPathFromDefinition(
        machineOptions,
        (definition.states as any)[key],
        newPath,
        mapper
      ),
    }),
    newState.states ?? ({} as any)
  );

  return newState;
};
