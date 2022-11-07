import {
  EventObject,
  Guard,
  StateMachine,
  StateNode,
  StateNodeDefinition,
  StateSchema,
} from "xstate";
import { getAllTransitionsFromDefinition } from "./get-all-transitions";

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
