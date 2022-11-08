import {
  EventObject,
  StateMachine,
  StateNode,
  StateNodeDefinition,
  StateSchema,
} from "xstate";

/**
 * Returns all states including root and all descendants.
 *
 * Note: this includes the "state" representing the machine itself if
 * passed a machine.
 *
 * To retrieve only "proper" states (excluding the root/machine itself),
 * use {@link getAllProperStates}.
 *
 * @param root The StateMachine or StateNode for which to get all states.
 * @returns A list of all states.
 */
export const getAllStates = <
  TContext,
  TStateSchema extends StateSchema<any>,
  TEvent extends EventObject,
  TStateMachine extends StateMachine<
    TContext,
    TStateSchema,
    TEvent,
    any,
    any,
    any
  >,
  TStateNode extends StateNode<TContext, TStateSchema, TEvent, any, any, any>
>(
  root: TStateMachine | TStateNode
): Array<StateNodeDefinition<TContext, TStateSchema, TEvent>> =>
  getAllStatesFromDefinition(root.definition);

/**
 * Returns all proper states (excluding root).
 * Includes all descendants of root.
 *
 * To retrieve all states (including the root/machine itself),
 * use {@link getAllStates}.
 *
 * @param root The StateMachine or StateNode for which to get all proper states.
 * @returns A list of all proper states.
 */
export const getAllProperStates = <
  TContext,
  TStateSchema extends StateSchema<any>,
  TEvent extends EventObject,
  TStateMachine extends StateMachine<
    TContext,
    TStateSchema,
    TEvent,
    any,
    any,
    any
  >,
  TStateNode extends StateNode<TContext, TStateSchema, TEvent, any, any, any>
>(
  root: TStateMachine | TStateNode
): Array<StateNodeDefinition<TContext, TStateSchema, TEvent>> =>
  Object.values(root.definition.states).flatMap(
    getAllStatesFromDefinition as any
  );

/**
 * Returns all states including root and all descendants.
 *
 * Note: this includes the "state" representing the machine itself if
 * passed a machine.
 *
 * @param root The StateNodeDefinition for which to get all states.
 * @returns A list of all states.
 */
export const getAllStatesFromDefinition = <
  TContext,
  TStateSchema extends StateSchema<any>,
  TEvent extends EventObject
>(
  definition: StateNodeDefinition<TContext, TStateSchema, TEvent>
): Array<StateNodeDefinition<TContext, TStateSchema, TEvent>> => {
  return [definition].concat(
    definition.states
      ? Object.keys(definition.states).flatMap((key: string) =>
          getAllStatesFromDefinition((definition.states as any)[key])
        )
      : []
  );
};
