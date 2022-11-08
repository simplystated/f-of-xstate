import {
  ActionObject,
  EventObject,
  StateMachine,
  StateNode,
  TransitionDefinitionMap,
} from "xstate";
import { MappableNodeDefinition } from "./map-states";

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
export const appendActionsToAllTransitions =
  <
    TContext,
    TEvent extends EventObject,
    Action extends ActionObject<TContext, TEvent>,
    T extends
      | StateNode<TContext, any, TEvent, any, any, any>
      | StateMachine<TContext, any, TEvent, any, any, any, any>
  >(
    actions: Array<Action>
  ) =>
  (state: MappableNodeDefinition<T["definition"]>): T["config"] => ({
    ...state,
    on: Object.keys(state.on).reduce(
      (on, stateKey) => ({
        ...on,
        [stateKey]: (state.on as TransitionDefinitionMap<TContext, any>)[
          stateKey
        ].map((transition) => ({
          ...transition,
          actions: transition.actions.concat(actions),
        })),
      }),
      {}
    ),
  });
