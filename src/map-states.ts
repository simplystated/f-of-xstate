import {
  ActionObject,
  EventObject,
  FinalStateNodeConfig,
  Guard,
  InvokeConfig,
  InvokeDefinition,
  MachineConfig,
  MachineOptions,
  StateMachine,
  StateNode,
  StateNodeConfig,
  StateNodeDefinition,
  StateSchema,
  StatesConfig,
  StatesDefinition,
  StateValue,
  TransitionConfig,
  TransitionDefinition,
  TransitionsConfig,
} from "xstate";

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

const transitionDefinitionToConfig = <TContext, TEvent extends EventObject>(
  transition: TransitionDefinition<TContext, TEvent>
): StructuredTransitionConfig<TContext, TEvent> & {
  event: TEvent | "" | "*";
} => ({
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
});

export interface StructuredTransitionConfig<
  TContext,
  TEvent extends EventObject
> extends TransitionConfig<TContext, TEvent> {
  event: TEvent["type"];
  cond?: Guard<TContext, TEvent>;
  actions: Array<ActionObject<TContext, TEvent>>;
  in?: StateValue;
  internal?: boolean;
  target: Array<string>;
  meta?: Record<string, any>;
  description?: string;
}
/**
 * UpdatableNodeDefinition attempts to provide the benefits of
 * both a `StateNodeDefinition` and a `StateNodeConfig`.
 * `StateNodeDefinition`s are nicer to read data from because they
 * have a definite structure. However, they are not suitable for
 * passing to `createMachine`. UpdatableNodeDefinition provides
 * readonly access to all `StateNodeDefinition` fields.
 * Updates may be performed via the mutating methods on this class.
 *
 * NOTE: all fields represent the original values of the
 * `StateNodeDefinition`. That is, after calling `clearInvocations`,
 * `.invoke` will still return the original invocations from the
 * `StateNodeDefinition`. Use the supplied getters to get the updated
 * data.
 *
 * NOTE 2: All fields return `StateNodeDefinition` shapes. All getters
 * return `StateNodeConfig` shapes. All mutators expect `StateNodeConfig`
 * shapes.
 */
export class UpdatableNodeDefinition<
  TContext,
  TStateSchema extends StateSchema<any>,
  TEvent extends EventObject
> implements
    Readonly<
      Omit<StateNodeDefinition<TContext, TStateSchema, TEvent>, "activities">
    >
{
  public readonly context;
  public readonly data;
  public readonly description;
  public readonly entry;
  public readonly exit;
  public readonly history;
  public readonly id;
  public readonly initial;
  public readonly invoke;
  public readonly key;
  public readonly meta;
  public readonly on;
  public readonly order;
  public readonly states;
  public readonly tags;
  public readonly transitions;
  public readonly type;
  public readonly version;
  public readonly machineOptions;

  private updatedInvokes: Array<InvokeConfig<TContext, TEvent>> | null = null;
  private updatedTransitions: Array<
    StructuredTransitionConfig<TContext, TEvent>
  > | null = null;
  private updatedEntryActions: Array<ActionObject<TContext, TEvent>> | null =
    null;
  private updatedExitActions: Array<ActionObject<TContext, TEvent>> | null =
    null;
  private updatedDoneDataMapper:
    | FinalStateNodeConfig<TContext, TEvent>["data"]
    | null = null;
  private updatedInitial: string | null = null;
  private updatedTags: Array<string> | null = null;
  private updatedMeta: any = null;
  private updatedDescription: string | null = null;
  private updatedHistory: boolean | "shallow" | "deep" | null = null;
  private updatedStates: StatesDefinition<
    TContext,
    TStateSchema,
    TEvent
  > | null = null;

  constructor(
    machineOptions: MachineOptions<TContext, TEvent>,
    definition: StateNodeDefinition<TContext, TStateSchema, TEvent>
  ) {
    this.machineOptions = machineOptions;
    this.context = definition.context;
    this.data = definition.data;
    this.description = definition.description;
    this.entry = definition.entry;
    this.exit = definition.exit;
    this.history = definition.history;
    this.id = definition.id;
    this.initial = definition.initial;
    this.invoke = definition.invoke;
    this.key = definition.key;
    this.meta = definition.meta;
    this.on = definition.on;
    this.order = definition.order;
    this.states = definition.states;
    this.tags = definition.tags;
    this.transitions = definition.transitions;
    this.type = definition.type;
    this.version = definition.version;
  }

  /**
   * Clear the invoke array.
   */
  public clearInvocations() {
    this.updatedInvokes = [];

    return this;
  }

  /**
   * Transform the invoke array by replacing each invoke config with
   * the result of applying the mapper to the original invoke.
   */
  public transformInvocations(
    mapper: (
      config: InvokeConfig<TContext, TEvent>
    ) => InvokeConfig<TContext, TEvent>
  ) {
    if (this.updatedInvokes) {
      this.updatedInvokes = this.updatedInvokes.map((invokeConfig) =>
        mapper(invokeConfig)
      );
    } else {
      this.updatedInvokes = this.invoke.map((invokeDefinition) =>
        mapper(invokeDefinitionToConfig(this.machineOptions, invokeDefinition))
      );
    }

    return this;
  }

  /**
   * Append the provided invocation config to the current list
   * of invocations.
   */
  public appendInvocation(invocation: InvokeConfig<TContext, TEvent>) {
    if (!this.updatedInvokes) {
      this.updatedInvokes = this.invoke.map((invoke) =>
        invokeDefinitionToConfig(this.machineOptions, invoke)
      );
    }
    this.updatedInvokes.push(invocation);

    return this;
  }

  /**
   * Get the array of current `InvocationConfig`s.
   */
  public getInvocations(): Array<InvokeConfig<TContext, TEvent>> {
    return (
      this.updatedInvokes ??
      this.invoke.map((invoke) =>
        invokeDefinitionToConfig(this.machineOptions, invoke)
      )
    );
  }

  /**
   * Set the list of invocation configurations.
   */
  public setInvocations(invocations: Array<InvokeConfig<TContext, TEvent>>) {
    this.updatedInvokes = invocations;

    return this;
  }

  /**
   * Clear the list of transitions originating from this state.
   */
  public clearTransitions() {
    this.updatedTransitions = [];

    return this;
  }

  /**
   * Transform all transitions by replacing each transition with the
   * result of applying the mapper to the original transition.
   */
  public transformTransitions(
    mapper: (
      config: StructuredTransitionConfig<TContext, TEvent>
    ) => StructuredTransitionConfig<TContext, TEvent>
  ) {
    if (this.updatedTransitions) {
      this.updatedTransitions = this.updatedTransitions.map(
        (transitionConfig) => mapper(transitionConfig)
      );
    } else {
      this.updatedTransitions = this.transitions.map((transitionDefinition) =>
        mapper(transitionDefinitionToConfig(transitionDefinition))
      );
    }

    return this;
  }

  /**
   * Append `transition` to the list of transitions originating from
   * this state.
   */
  public appendTransition(
    transition: StructuredTransitionConfig<TContext, TEvent>
  ) {
    if (!this.updatedTransitions) {
      this.updatedTransitions = this.transitions.map((transition) =>
        transitionDefinitionToConfig(transition)
      );
    }
    this.updatedTransitions.push(transition);

    return this;
  }

  /**
   * Get the array of current `TransitionConfig`s.
   */
  public getTransitions(): Array<TransitionConfig<TContext, TEvent>> {
    return (
      this.updatedTransitions ??
      this.transitions.map((transition) =>
        transitionDefinitionToConfig(transition)
      )
    );
  }

  /**
   * Set the list of transitions originating from this state.
   */
  public setTransitions(
    transitions: Array<StructuredTransitionConfig<TContext, TEvent>>
  ) {
    this.updatedTransitions = transitions;

    return this;
  }

  /**
   * Clear the list of entry actions.
   */
  public clearEntryActions() {
    this.updatedEntryActions = [];

    return this;
  }

  /**
   * Transform all entry actions by replacing each action with the
   * result of applying the mapper to the original action.
   */
  public transformEntryActions(
    mapper: (
      config: ActionObject<TContext, TEvent>
    ) => ActionObject<TContext, TEvent>
  ) {
    if (this.updatedEntryActions) {
      this.updatedEntryActions = this.updatedEntryActions.map((entryAction) =>
        mapper(entryAction)
      );
    } else {
      this.updatedEntryActions = this.entry.map((entryAction) =>
        mapper(entryAction)
      );
    }

    return this;
  }

  /**
   * Append `action` to the list of entry actions.
   */
  public appendEntryAction(action: ActionObject<TContext, TEvent>) {
    if (!this.updatedEntryActions) {
      this.updatedEntryActions = this.entry;
    }
    this.updatedEntryActions.push(action);

    return this;
  }

  /**
   * Get the array of current `ActionObject` entry actions.
   */
  public getEntryActions(): Array<ActionObject<TContext, TEvent>> {
    return this.updatedEntryActions ?? this.entry;
  }

  /**
   * Set the list of exit actions.
   */
  public setEntryActions(actions: Array<ActionObject<TContext, TEvent>>) {
    this.updatedEntryActions = actions;

    return this;
  }

  /**
   * Clear the list of exit actions.
   */
  public clearExitActions() {
    this.updatedExitActions = [];

    return this;
  }

  /**
   * Transform all exit actions by replacing each action with the
   * result of applying the mapper to the original action.
   */
  public transformExitActions(
    mapper: (
      config: ActionObject<TContext, TEvent>
    ) => ActionObject<TContext, TEvent>
  ) {
    if (this.updatedExitActions) {
      this.updatedExitActions = this.updatedExitActions.map((exitAction) =>
        mapper(exitAction)
      );
    } else {
      this.updatedExitActions = this.exit.map((exitAction) =>
        mapper(exitAction)
      );
    }

    return this;
  }

  /**
   * Append `action` to the list of exit actions.
   */
  public appendExitAction(action: ActionObject<TContext, TEvent>) {
    if (!this.updatedExitActions) {
      this.updatedExitActions = this.exit;
    }
    this.updatedExitActions.push(action);

    return this;
  }

  /**
   * Get the array of current `ActionObject` exit actions.
   */
  public getExitActions(): Array<ActionObject<TContext, TEvent>> {
    return this.updatedExitActions ?? this.exit;
  }

  /**
   * Set the list of exit actions.
   */
  public setExitActions(actions: Array<ActionObject<TContext, TEvent>>) {
    this.updatedExitActions = actions;

    return this;
  }

  /**
   * Set the final state done data mapper.
   */
  public setDoneDataMapper(
    done: FinalStateNodeConfig<TContext, TEvent>["data"]
  ): FinalStateNodeConfig<TContext, TEvent>["data"] {
    this.updatedDoneDataMapper = done;

    return this;
  }

  /**
   * Set the initial state.
   */
  public setInitial(initial: string) {
    this.updatedInitial = initial;

    return this;
  }

  /**
   * Set the meta for this state.
   */
  public setMeta(meta: Extract<any, undefined>) {
    this.updatedMeta = meta;

    return this;
  }

  /**
   * Set the tags for this state.
   */
  public setTags(tags: Array<string>) {
    this.updatedTags = tags;

    return this;
  }

  /**
   * Set the description for this state.
   */
  public setDescription(description: string) {
    this.updatedDescription = description;

    return this;
  }

  /**
   * Set the history type for this state.
   */
  public setHistory(history: boolean | "shallow" | "deep") {
    this.updatedHistory = history;

    return this;
  }

  /**
   * Set the child states for this state.
   *
   * NOTE: these states will be mapped over by {@link index.mapStates}.
   */
  public setChildStates(
    states: Record<string, StateNodeConfig<TContext, TStateSchema, TEvent>>
  ) {
    this.updatedStates = Object.keys(states).reduce((stateDefinitions, key) => {
      const state = new StateNode(states[key]).definition;
      return {
        ...stateDefinitions,
        [key]: state,
      };
    }, {} as StatesDefinition<TContext, TStateSchema, TEvent>);

    return this;
  }

  /**
   * Combine the original `StateNodeDefinition` with all updates
   * from mutator calls and return (essentially) a `StateNodeConfig`.
   * However, the `states` property of the returned object will contain
   * `StateNodeDefinition`s instead of `StateNodeConfig`s.
   */
  public toStateNodeConfig(): Omit<
    StateNodeConfig<TContext, TStateSchema, TEvent>,
    "states"
  > &
    Pick<StateNodeDefinition<TContext, TStateSchema, TEvent>, "states"> {
    const transitionConfigs =
      this.updatedTransitions ??
      this.transitions.map(transitionDefinitionToConfig);
    const [on, always]: [
      TransitionsConfig<TContext, TEvent>,
      TransitionsConfig<TContext, TEvent>
    ] = transitionConfigs.reduce(
      ([on, always], transition) => {
        return transition.event === ""
          ? [on, (always as any).concat([transition])]
          : [(on as any).concat([transition]), always];
      },
      [[], []]
    );

    return {
      data: this.updatedDoneDataMapper ?? this.data,
      description: this.updatedDescription ?? this.description,
      entry: this.updatedEntryActions ?? this.entry,
      exit: this.updatedExitActions ?? this.exit,
      history: this.updatedHistory ?? this.history,
      id: this.id,
      initial: (this.updatedInitial as any) ?? this.initial,
      invoke:
        this.updatedInvokes ??
        this.invoke.map((invoke) =>
          invokeDefinitionToConfig(this.machineOptions, invoke)
        ),
      key: this.key,
      meta:
        typeof this.updatedMeta === "undefined" ? this.meta : this.updatedMeta,
      on,
      always,
      order: this.order,
      states: this.updatedStates ?? this.states,
      tags: this.updatedTags ?? this.tags,
      type: this.type,
    };
  }
}

/**
 * Mapper function used by {@link mapStates} to map an
 * {@link UpdatableNodeDefinition} and a {@link StatePath}
 * to an updated UpdatableNodeDefinition.

 * `node`: An {@link UpdatableNodeDefinition} representing the current
 * state and exposing clear/set/append/map methods to effect changes
 * to the state. The mutated node should be returned from the mapper.
 * 
 * `statePath`:
 *           1
 *        2      3
 *     4             6
 *
 * Imagining the numbers above as state IDs,
 * when processing node "4" in the tree above, paths will be ["1", "2"]
 */
export type MapStatesMapper<
  TContext,
  TStateSchema extends StateSchema<any>,
  TEvent extends EventObject
> = (
  node: UpdatableNodeDefinition<TContext, TStateSchema, TEvent>,
  statePath: StatePath<StateNodeConfig<TContext, TStateSchema, TEvent>>
) => UpdatableNodeDefinition<TContext, TStateSchema, TEvent>;

/**
 * Construct a new `StateNodeConfig` (suitable for passing to `createMachine`)
 * by walking an existing `StateMachine` or `StateNode`
 * (e.g. the output of `createMachine`) and replacing each state with the
 * output of the supplied `mapper` applied to the supplied state.
 * 
 * NOTE: The mapper must use the mutating methods on the provided
 * {@link UpdatableNodeDefinition} to create an updated configuration
 * and return the result.

 * @example
 * Update state metadata:
 * ```
 * import { createMachine } from "xstate";
 * import { mapStates } from "@simplystated/f-of-xstate";
 * const machine = createMachine(...);
 * const config = mapStatesFromDefinition(
 *   machine,
 *   (state) => state.updateMeta({
 *     ...state.meta,
 *     stateId: state.id
 *   })
 * );
 * const updatedMachine = createMachine(config); 
 * ```
 * 
 * @param root StateMachine or StateNode to map over.
 * @param mapper Function that maps the existing node and
 * a state path to a possibly-updated new state.
 *
 * `node`: An {@link UpdatableNodeDefinition} representing the current
 * state and exposing clear/set/append/map methods to effect changes
 * to the state. The mutated node should be returned from the mapper.
 * 
 * `statePath`:
 *           1
 *        2      3
 *     4             6
 *
 * Imagining the numbers above as state IDs,
 * when processing node "4" in the tree above, paths will be ["1", "2"]
 * @returns The new `StateNodeConfig` resulting from applying `mapper`
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
 * @param mapper Function that returns a new `StateNodeConfig`
 * given an existing `StateNodeDefinition` and a state path.
 *
 * `node` provides a full `StateNodeDefinition` but renames the
 * `transitions` property to `readonlyTransitions`. This is to
 * ensure that mapper implementers do not expect that returning a
 * state with a `transitions` property will have any effect.
 * *IMPORTANT*: All transitions for the mapped states are taken from the
 * `on` property returned by `mapper`. `readonlyTransitions` is ignored!
 *
 * `statePath`:
 *           1
 *        2      3
 *     4             6
 *
 * Imagining the numbers above as state IDs,
 * when processing node "4" in the tree above, paths will be ["1", "2"]
 *
 * Generally, `mapper` should return a modified copy of the provided state.
 * E.g. with `(state) => ({ ...state, modifications: "here" })`
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
  mapStatesWithPathFromDefinition(machineOptions, definition, [], mapper);

/**
 * The path of states from the root to the current node.
 */
export type StatePath<R extends StateNodeConfig<any, any, any>> = Array<
  Omit<R, "states">
>;

const mapStatesWithPathFromDefinition = <
  TContext,
  TStateSchema extends StateSchema<any>,
  TEvent extends EventObject
>(
  machineOptions: MachineOptions<TContext, TEvent>,
  definition: StateNodeDefinition<TContext, TStateSchema, TEvent>,
  path: Array<Omit<StateNodeConfig<TContext, TStateSchema, TEvent>, "states">>,
  mapper: MapStatesMapper<TContext, TStateSchema, TEvent>
): StateNodeConfig<TContext, TStateSchema, TEvent> => {
  const mapped = mapper(
    new UpdatableNodeDefinition(machineOptions, definition),
    path
  );

  const config = mapped.toStateNodeConfig();
  const newPath = path.concat(config);

  const newState: StateNodeConfig<TContext, TStateSchema, TEvent> = {
    ...config,
    states: {} as StatesConfig<TContext, TStateSchema, TEvent>,
  };

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
    {} as StatesConfig<TContext, TStateSchema, TEvent>
  );

  return newState;
};
