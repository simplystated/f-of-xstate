import {
  EventObject,
  InvokeDefinition,
  StateMachine,
  StateNode,
  StateNodeDefinition,
  StateSchema,
} from "xstate";
import { getAllStatesFromDefinition } from "./get-all-states";

/**
 * Returns all invocations across all states for the provided root and all descendants.
 *
 * @param root Machine or StateNode to get all invocations for.
 * @returns All invocations for the provided Machine or StateNode and all descendants.
 */
export const getAllInvocations = <
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
): Array<InvokeDefinition<TContext, TEvent>> =>
  getAllInvocationsFromDefinition(root.definition);

/**
 * Returns all invocations across all states for the provided root and all descendants.
 *
 * @param root StateNodeDefinition to get all invocations for.
 * @returns All invocations for the provided StateNodeDefinition and all descendants.
 */
export const getAllInvocationsFromDefinition = <
  TContext,
  TStateSchema extends StateSchema<any>,
  TEvent extends EventObject
>(
  definition: StateNodeDefinition<TContext, TStateSchema, TEvent>
): Array<InvokeDefinition<TContext, TEvent>> =>
  getAllStatesFromDefinition(definition).flatMap((state) => state.invoke);
