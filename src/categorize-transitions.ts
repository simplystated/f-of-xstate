import {
  ActionTypes,
  DelayedTransitionDefinition,
  EventObject,
  TransitionDefinition,
} from "xstate";

/**
 * Return type for {@link categorizeTransitions}.
 *
 * Each property represents a transition category and contains
 * an array of the transitions in that category
 * (with additional information for some categories).
 *
 * Note: each transition will appear in only one category even though
 * `delayDone` and `always` may overlap.
 * A delayed always transition will appear in `delayDone`.
 */
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

/**
 * Is `transition` a delayed transition?
 *
 * @param transition A potentially delayed `TransitionDefinition`
 * @returns Whether the transition is a delayed transition.
 */
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

/**
 * Is `transition` an always transition?
 *
 * @param transition A potentially always `TransitionDefinition`
 * @returns Whether the transition is an always transition.
 */
export const isAlwaysTransition = <TContext, TEvent extends EventObject>(
  transition: TransitionDefinition<TContext, TEvent>
): boolean => transition.eventType === "";

/**
 * Is `transition` a wildcard transition?
 *
 * @param transition A potentially wildcard `TransitionDefinition`
 * @returns Whether the transition is a wildcard transition.
 */
export const isWildcardTransition = <TContext, TEvent extends EventObject>(
  transition: TransitionDefinition<TContext, TEvent>
): boolean => transition.eventType === "*";

/**
 * Is `transition` a state done transition?
 * (e.g. from a state's `onDone` property)?
 *
 * @param transition A potentially state done `TransitionDefinition`
 * @returns Whether the transition is a state done transition.
 */
export const isStateDoneTransition = <TContext, TEvent extends EventObject>(
  transition: TransitionDefinition<TContext, TEvent>
): boolean => transition.eventType.startsWith(`${ActionTypes.DoneState}.`);

/**
 * Is `transition` an invocation done transition?
 * (e.g. from an `invoke`'s `onDone` property)?
 *
 * @param transition A potentially invocation done `TransitionDefinition`
 * @returns Whether the transition is an invocation done transition.
 */
export const isInvocationDoneTransition = <
  TContext,
  TEvent extends EventObject
>(
  transition: TransitionDefinition<TContext, TEvent>
): boolean => transition.eventType.startsWith(`${ActionTypes.DoneInvoke}.`);

/**
 * Is `transition` an invocation error transition?
 * (e.g. from an `invoke`'s `onError` property)?
 *
 * @param transition A potentially invocation error `TransitionDefinition`
 * @returns Whether the transition is an invocation error transition.
 */
export const isInvocationErrorTransition = <
  TContext,
  TEvent extends EventObject
>(
  transition: TransitionDefinition<TContext, TEvent>
): boolean => transition.eventType.startsWith(`${ActionTypes.ErrorPlatform}.`);

/**
 * Is `transition` a regular event transition?
 *
 * @param transition A potentially regular event `TransitionDefinition`
 * @returns Whether the transition is regular event transition.
 */
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

/**
 * Given an array of `TransitionDefinition`s such as those returned by
 * `xstate.createMachine(...).definition.transitions` or by
 * {@link getAllTransitions}, categorize the transitions and return
 * a structure of arrays of each category.

 * Note: each transition will appear in only one category even though
 * `delayDone` and `always` may overlap.
 * A delayed always transition will appear in `delayDone`.
 * 
 * @param transitions An array of `TransitionDefinition`s (or `DelayedTransitionDefinition`s)
 * @returns Categorized transitions.
 */
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
