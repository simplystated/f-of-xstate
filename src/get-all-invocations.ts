import {
  EventObject,
  InvokeDefinition,
  StateMachine,
  StateNode,
  StateNodeDefinition,
  StateSchema,
} from "xstate";
import { getAllStatesFromDefinition } from "./get-all-states";

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

export const getAllInvocationsFromDefinition = <
  TContext,
  TStateSchema extends StateSchema<any>,
  TEvent extends EventObject
>(
  definition: StateNodeDefinition<TContext, TStateSchema, TEvent>
): Array<InvokeDefinition<TContext, TEvent>> =>
  getAllStatesFromDefinition(definition).flatMap((state) => state.invoke);
