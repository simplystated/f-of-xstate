import {
  DelayedTransitionDefinition,
  EventObject,
  StateMachine,
  StateNode,
  StateNodeDefinition,
  StateSchema,
  TransitionDefinition,
} from "xstate";
import { getAllStatesFromDefinition } from "./get-all-states";

/**
 * Returns all transitions of any type across all states
 * for the provided root and all descendants.
 *
 * @param root Machine or StateNode to get all transitions for.
 * @returns All transitions for the provided Machine or StateNode and all descendants.
 */
export const getAllTransitions = <
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
): Array<
  | TransitionDefinition<TContext, TEvent>
  | DelayedTransitionDefinition<TContext, TEvent>
> => getAllTransitionsFromDefinition(root.definition);

/**
 * Returns all transitions of any type across all states
 * for the provided root and all descendants.
 *
 * @param root StateNodeDefinition to get all transitions for.
 * @returns All transitions for the provided StateNodeDefinition and all descendants.
 */
export const getAllTransitionsFromDefinition = <
  TContext,
  TStateSchema extends StateSchema<any>,
  TEvent extends EventObject
>(
  definition: StateNodeDefinition<TContext, TStateSchema, TEvent>
): Array<
  | TransitionDefinition<TContext, TEvent>
  | DelayedTransitionDefinition<TContext, TEvent>
> =>
  getAllStatesFromDefinition(definition).flatMap(
    (stateDefinition) => stateDefinition.transitions
  );
