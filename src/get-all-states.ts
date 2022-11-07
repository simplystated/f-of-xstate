import {
  EventObject,
  StateMachine,
  StateNode,
  StateNodeDefinition,
  StateSchema,
} from "xstate";

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
