import { ActionObject, EventObject, StateSchema } from "xstate";
import {
  MapStatesMapper,
  StatePath,
  StructuredSourceStateNodeConfig,
  StructuredTransformedStateNodeConfig,
  StructuredTransitionConfig,
} from "./map-states";

/**
 * Produces a mapper to be used with {@link mapStates} to map over
 * all state transitions.
 *
 * One common gotcha: you either need to do a bunch of work to figure out
 * relative target ids or you can rely on the fact that `StructuredTransitionConfig`s
 * always have unique ids and use `#${absoluteTargets}` for transitions.
 *
 * @returns A mapper to be passed to {@link mapStates}
 */
export const mapTransitions =
  <TContext, TStateSchema extends StateSchema<any>, TEvent extends EventObject>(
    mapper: (
      transition: StructuredTransitionConfig<TContext, TEvent>
    ) => StructuredTransitionConfig<TContext, TEvent>
  ) =>
  (
    state: StructuredSourceStateNodeConfig<TContext, TStateSchema, TEvent>
  ): StructuredTransformedStateNodeConfig<TContext, TStateSchema, TEvent> => ({
    ...state,
    transitions: state.transitions.map(mapper),
  });

/**
 * Produces a mapper to be used with {@link mapStates} to filter
 * state transitions. Only transitions for which the predicate
 * returns true will be kept.
 *
 * @returns A mapper to be passed to {@link mapStates}
 */
export const filterTransitions =
  <TContext, TStateSchema extends StateSchema<any>, TEvent extends EventObject>(
    predicate: (
      transition: StructuredTransitionConfig<TContext, TEvent>,
      state: StructuredSourceStateNodeConfig<TContext, TStateSchema, TEvent>,
      path: StatePath<
        StructuredTransformedStateNodeConfig<TContext, TStateSchema, TEvent>
      >
    ) => boolean
  ) =>
  (
    state: StructuredSourceStateNodeConfig<TContext, TStateSchema, TEvent>,
    path: StatePath<
      StructuredTransformedStateNodeConfig<TContext, TStateSchema, TEvent>
    >
  ): StructuredTransformedStateNodeConfig<TContext, TStateSchema, TEvent> => ({
    ...state,
    transitions: state.transitions.filter((transition) =>
      predicate(transition, state, path)
    ),
  });

/**
 * Produces a mapper to be used with {@link mapStates} to append
 * state transitions.
 *
 * One common gotcha: you either need to do a bunch of work to figure out
 * relative target ids or you can rely on the fact that `StructuredTransitionConfig`s
 * always have unique ids and use `#${absoluteTargets}` for transitions.
 *
 * @returns A mapper to be passed to {@link mapStates}
 */
export const appendTransitions =
  <TContext, TStateSchema extends StateSchema<any>, TEvent extends EventObject>(
    transitionsGetter: (
      state: StructuredSourceStateNodeConfig<TContext, TStateSchema, TEvent>
    ) => Array<StructuredTransitionConfig<TContext, TEvent>>
  ) =>
  (
    state: StructuredSourceStateNodeConfig<TContext, TStateSchema, TEvent>
  ): StructuredTransformedStateNodeConfig<TContext, TStateSchema, TEvent> => ({
    ...state,
    transitions: state.transitions.concat(transitionsGetter(state)),
  });

/**
 * Produces a mapper to be used with {@link mapStates} to invoke another
 * mapper only if the state matches some predicate.
 *
 * @returns A mapper to be passed to {@link mapStates}
 */
export const filterMapStates =
  <TContext, TStateSchema extends StateSchema<any>, TEvent extends EventObject>(
    predicate: (
      state: StructuredSourceStateNodeConfig<TContext, TStateSchema, TEvent>,
      path: StatePath<
        StructuredTransformedStateNodeConfig<TContext, TStateSchema, TEvent>
      >
    ) => boolean,
    mapper: MapStatesMapper<TContext, TStateSchema, TEvent>
  ) =>
  (
    state: StructuredSourceStateNodeConfig<TContext, TStateSchema, TEvent>,
    path: StatePath<
      StructuredTransformedStateNodeConfig<TContext, TStateSchema, TEvent>
    >
  ): StructuredTransformedStateNodeConfig<TContext, TStateSchema, TEvent> =>
    predicate(state, path) ? mapper(state, path) : state;

/**
 * Produces a mapper to be used with {@link mapStates} to append
 * the provided actions onto every transition in the mapped machine.
 *
 * @example
 * Appending a logging action to every transition.
 * ```
 * import { createMachine, actions } from "xstate";
 * import { mapStates, appendActionsToAllTransitions } from "@simplystated/f-of-xstate";
 * const machine = createMachine(...);
 * const config = mapStates(
 *   machine,
 *   appendActionsToAllTransitions([
 *     actions.log((_, evt) => `Hello ${evt.type}`)
 *   ])
 * );
 * const updatedMachine = createMachine(config);
 * ```
 *
 * @param actions Array of `ActionObject`s to append to every transition's actions.
 * @returns A mapper to be passed to {@link mapStates}
 */
export const appendActionsToAllTransitions = <
  TContext,
  TEvent extends EventObject,
  Action extends ActionObject<TContext, TEvent>
>(
  actions: Array<Action>
) =>
  mapTransitions((transition) => ({
    ...transition,
    actions: transition.actions.concat(actions),
  }));
