import {
  ActionObject,
  EventObject,
  StateMachine,
  StateNode,
  StateNodeDefinition,
  StateSchema,
} from "xstate";
import { getAllStatesFromDefinition } from "./get-all-states";

/**
 * Returns all actions (transition actions, entry actions, exit actions, etc.)
 * for the provided root and all descendants.
 *
 * @param root Machine or StateNode to get all actions for.
 * @returns All actions for the provided Machine or StateNode and all descendants.
 */
export const getAllActions = <
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
): Array<ActionObject<TContext, TEvent>> =>
  getAllActionsFromDefinition(root.definition);

/**
 * Returns all actions (transition actions, entry actions, exit actions, etc.)
 * for the provided root and all descendants.
 *
 * @param root StateNodeDefinition to get all actions for.
 * @returns All actions for the provided StateNodeDefinition and all descendants.
 */
export const getAllActionsFromDefinition = <
  TContext,
  TStateSchema extends StateSchema<any>,
  TEvent extends EventObject
>(
  definition: StateNodeDefinition<TContext, TStateSchema, TEvent>
): Array<ActionObject<TContext, TEvent>> =>
  getAllStatesFromDefinition(definition).flatMap((state) =>
    state.entry
      .concat(state.exit)
      .concat(state.transitions.flatMap((t) => t.actions))
  );
