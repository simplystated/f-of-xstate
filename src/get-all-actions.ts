import {
  ActionObject,
  EventObject,
  StateMachine,
  StateNode,
  StateNodeDefinition,
  StateSchema,
} from "xstate";
import { getAllStatesFromDefinition } from "./get-all-states";

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

export const getAllActionsFromDefinition = <
  TContext,
  TStateSchema extends StateSchema<any>,
  TEvent extends EventObject
>(
  definition: StateNodeDefinition<TContext, TStateSchema, TEvent>
): Array<ActionObject<TContext, TEvent>> =>
  getAllStatesFromDefinition(definition)
    .flatMap(state => state.entry.concat(state.exit).concat(state.transitions.flatMap(t => t.actions)))
