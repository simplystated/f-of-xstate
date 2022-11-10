import { ActionObject, EventObject, StateSchema } from "xstate";
import { UpdatableNodeDefinition } from "./map-states";

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
    TStateSchema extends StateSchema<any>,
    TEvent extends EventObject,
    Action extends ActionObject<TContext, TEvent>
  >(
    actions: Array<Action>
  ) =>
  (
    state: UpdatableNodeDefinition<TContext, TStateSchema, TEvent>
  ): UpdatableNodeDefinition<TContext, TStateSchema, TEvent> =>
    state.transformTransitions((transition) => ({
      ...transition,
      actions: transition.actions.concat(actions),
    }));
