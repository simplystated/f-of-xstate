import {
  ActionTypes,
  DelayedTransitionDefinition,
  EventObject,
  TransitionDefinition,
} from "xstate";

export interface TransitionsByCategory<TContext, TEvent extends EventObject> {
  eventOccurred: Array<TransitionDefinition<TContext, TEvent>>;
  stateDone: Array<{
    transition: TransitionDefinition<TContext, TEvent>;
    stateId: string;
  }>;
  invocationDone: Array<{
    transition: TransitionDefinition<TContext, TEvent>;
    invocationId: string;
  }>;
  invocationError: Array<{
    transition: TransitionDefinition<TContext, TEvent>;
    invocationId: string;
  }>;
  delayDone: Array<DelayedTransitionDefinition<TContext, TEvent>>;
  always: Array<TransitionDefinition<TContext, TEvent>>;
  wildcard: Array<TransitionDefinition<TContext, TEvent>>;
}

export function isDelayedTransition<TContext, TEvent extends EventObject>(
  transition:
    | TransitionDefinition<TContext, TEvent>
    | DelayedTransitionDefinition<TContext, TEvent>
): transition is DelayedTransitionDefinition<TContext, TEvent> {
  return (
    "delay" in transition &&
    typeof transition.delay !== "undefined" &&
    transition.delay !== null
  );
}

export const isAlwaysTransition = <TContext, TEvent extends EventObject>(
  transition: TransitionDefinition<TContext, TEvent>
): boolean => transition.eventType === "";

export const isWildcardTransition = <TContext, TEvent extends EventObject>(
  transition: TransitionDefinition<TContext, TEvent>
): boolean => transition.eventType === "*";

export const isStateDoneTransition = <TContext, TEvent extends EventObject>(
  transition: TransitionDefinition<TContext, TEvent>
): boolean => transition.eventType.startsWith(`${ActionTypes.DoneState}.`);

export const isInvocationDoneTransition = <
  TContext,
  TEvent extends EventObject
>(
  transition: TransitionDefinition<TContext, TEvent>
): boolean => transition.eventType.startsWith(`${ActionTypes.DoneInvoke}.`);

export const isInvocationErrorTransition = <
  TContext,
  TEvent extends EventObject
>(
  transition: TransitionDefinition<TContext, TEvent>
): boolean => transition.eventType.startsWith(`${ActionTypes.ErrorPlatform}.`);

export const isEventTransition = <TContext, TEvent extends EventObject>(
  transition: TransitionDefinition<TContext, TEvent>
): boolean =>
  !(
    isAlwaysTransition(transition) ||
    isWildcardTransition(transition) ||
    isStateDoneTransition(transition) ||
    isInvocationDoneTransition(transition) ||
    isInvocationErrorTransition(transition)
  );

const stateDoneRegex = new RegExp(
  `^${ActionTypes.DoneState.replace(".", "[.]")}[.]`
);
const invocationDoneRegex = new RegExp(
  `^${ActionTypes.DoneInvoke.replace(".", "[.]")}[.]`
);
const invocationErrorRegex = new RegExp(
  `^${ActionTypes.ErrorPlatform.replace(".", "[.]")}[.]`
);

export const categorizeTransitions = <TContext, TEvent extends EventObject>(
  transitions: Array<
    | TransitionDefinition<TContext, TEvent>
    | DelayedTransitionDefinition<TContext, TEvent>
  >
): TransitionsByCategory<TContext, TEvent> =>
  transitions.reduce(
    (transitionsByCategory, transition) => {
      if (isDelayedTransition(transition)) {
        transitionsByCategory.delayDone.push(transition);
        return transitionsByCategory;
      }

      if (isAlwaysTransition(transition)) {
        transitionsByCategory.always.push(transition);
        return transitionsByCategory;
      }

      if (isWildcardTransition(transition)) {
        transitionsByCategory.wildcard.push(transition);
        return transitionsByCategory;
      }

      if (isStateDoneTransition(transition)) {
        transitionsByCategory.stateDone.push({
          transition,
          stateId: transition.eventType.replace(stateDoneRegex, ""),
        });
        return transitionsByCategory;
      }

      if (isInvocationDoneTransition(transition)) {
        transitionsByCategory.invocationDone.push({
          transition,
          invocationId: transition.eventType.replace(invocationDoneRegex, ""),
        });
        return transitionsByCategory;
      }

      if (isInvocationErrorTransition(transition)) {
        transitionsByCategory.invocationError.push({
          transition,
          invocationId: transition.eventType.replace(invocationErrorRegex, ""),
        });
        return transitionsByCategory;
      }

      transitionsByCategory.eventOccurred.push(transition);

      return transitionsByCategory;
    },
    {
      eventOccurred: [],
      stateDone: [],
      invocationDone: [],
      invocationError: [],
      delayDone: [],
      always: [],
      wildcard: [],
    } as TransitionsByCategory<TContext, TEvent>
  );
