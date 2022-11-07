import {
  EventObject,
  StateMachine,
  StateNode,
  StateNodeDefinition,
  StateSchema,
  TransitionDefinition,
} from "xstate";
import { getAllStatesFromDefinition } from "./get-all-states";

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
): Array<TransitionDefinition<TContext, TEvent>> =>
  getAllTransitionsFromDefinition(root.definition);

export const getAllTransitionsFromDefinition = <
  TContext,
  TStateSchema extends StateSchema<any>,
  TEvent extends EventObject
>(
  definition: StateNodeDefinition<TContext, TStateSchema, TEvent>
): Array<TransitionDefinition<TContext, TEvent>> =>
  getAllStatesFromDefinition(definition).flatMap(
    (stateDefinition) => stateDefinition.transitions
  );
