import {
  EventObject,
  Guard,
  StateMachine,
  StateNode,
  StateNodeDefinition,
  StateSchema,
} from "xstate";
import { getAllTransitionsFromDefinition } from "./get-all-transitions";

/**
 * Returns all conditions across all transitions for the provided root and all descendants.
 *
 * @param root Machine or StateNode to get all conditions for.
 * @returns All conditions for the provided Machine or StateNode and all descendants.
 */
export const getAllConditions = <
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
): Array<Guard<TContext, TEvent>> =>
  getAllConditionsFromDefinition(root.definition);

/**
 * Returns all conditions across all transitions for the provided root and all descendants.
 *
 * @param root StateNodeDefinition to get all conditions for.
 * @returns All conditions for the provided StateNodeDefinition and all descendants.
 */
export const getAllConditionsFromDefinition = <
  TContext,
  TStateSchema extends StateSchema<any>,
  TEvent extends EventObject
>(
  definition: StateNodeDefinition<TContext, TStateSchema, TEvent>
): Array<Guard<TContext, TEvent>> =>
  getAllTransitionsFromDefinition(definition)
    .map((t) => t.cond)
    .filter(isCond);

function isCond<TGuard extends Guard<any, any>>(
  cond: TGuard | undefined
): cond is TGuard {
  return !!cond;
}
