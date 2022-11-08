import {
  ActionObject,
  EventObject,
  StateMachine,
  StateNode,
  TransitionDefinitionMap,
} from "xstate";
import { MappableNodeDefinition } from "./map-states";

export const appendActionsToAllTransitions =
  <
    TContext,
    TEvent extends EventObject,
    Action extends ActionObject<TContext, TEvent>,
    T extends
      | StateNode<TContext, any, TEvent, any, any, any>
      | StateMachine<TContext, any, TEvent, any, any, any, any>
  >(
    actions: Array<Action>
  ) =>
  (state: MappableNodeDefinition<T["definition"]>): T["config"] => ({
    ...state,
    on: Object.keys(state.on).reduce(
      (on, stateKey) => ({
        ...on,
        [stateKey]: (state.on as TransitionDefinitionMap<TContext, any>)[
          stateKey
        ].map((transition) => ({
          ...transition,
          actions: transition.actions.concat(actions),
        })),
      }),
      {}
    ),
  });
