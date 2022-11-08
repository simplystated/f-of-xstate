import {
  StateMachine,
  StateNode,
  StateNodeConfig,
  StateNodeDefinition,
} from "xstate";

/**
 * A normal StateNodeDefinition is unsuitable to use as an input
 * to createMachine or even as an input from which to derive a
 * configuration to pass to createMachine because its
 * `transitions` property duplicates/conflicts with its `on` property.
 *
 * A `MappableNodeDefinition` preserves the `transitions` property
 * but renames it to `readonlyTransitions` to make it clear that
 * `readonlyTransitions` will be ignored in generating the new
 * machine configuration.
 */
export type MappableNodeDefinition<
  T extends StateNodeDefinition<any, any, any>
> = Omit<T, "transitions"> & {
  readonlyTransitions: T["transitions"];
};

/**
 * Construct a new `StateNodeConfig` (suitable for passing to `createMachine`)
 * by walking an existing `StateMachine` or `StateNode`
 * (e.g. the output of `createMachine`) and replacing each state with the
 * output of the supplied `mapper` applied to the supplied state.
 * 
 * NOTE: `readonlyTransitions` will be ignored if returned by the `mapper`.
 * All events are taken from `on`, `always`, etc.

 * @example
 * Update state metadata:
 * ```
 * import { createMachine } from "xstate";
 * import { mapStates } from "@simplystated/f-of-xstate";
 * const machine = createMachine(...);
 * const config = mapStatesFromDefinition(
 *   machine,
 *   (state) => ({
 *     ...state,
 *     meta: {
 *       ...state.meta,
 *       stateId: state.id,
 *     }
 *   })
 * );
 * const updatedMachine = createMachine(config); 
 * ```
 * 
 * @param root StateMachine or StateNode to map over.
 * @param mapper Function that returns a new `StateNodeConfig`
 * given an existing `StateNodeDefinition`.
 * @returns The new `StateNodeConfig` resulting from applying `mapper`
 * to each state.
 */
export const mapStates = <
  T extends
    | StateNode<any, any, any, any, any, any>
    | StateMachine<any, any, any, any, any, any, any>
>(
  root: T,
  mapper: (node: MappableNodeDefinition<T["definition"]>) => T["config"]
): T["config"] => {
  const machineDefinition = mapStatesFromDefinition(root.definition, mapper);
  return machineDefinition;
};

/**
 * Most users will prefer to use {@link mapStates}.
 * Only use `mapStatesFromDefinition` if you already have a StateNodeDefinition.
 *
 * Construct a new `StateNodeConfig` (suitable for passing to `createMachine`)
 * by walking an existing `StateNodeDefinition`
 * (e.g. the output of `createMachine(...).definition`)
 * and replacing each state with the output of the supplied
 * `mapper` applied to the supplied state.
 *
 * NOTE: `readonlyTransitions` will be ignored if returned by the `mapper`.
 * All events are taken from `on`, `always`, etc.
 *
 * @example
 * Update state metadata:
 * ```
 * import { createMachine } from "xstate";
 * import { mapStatesFromDefinition } from "@simplystated/f-of-xstate";
 * const definition = createMachine(...).definition;
 * const config = mapStatesFromDefinition(
 *   definition,
 *   (state) => ({
 *     ...state,
 *     meta: {
 *       ...state.meta,
 *       stateId: state.id,
 *     }
 *   })
 * );
 * const updatedMachine = createMachine(config);
 * ```
 *
 * @param root StateNodeDefinition to map over.
 * @param mapper Function that returns a new `StateNodeConfig`
 * given an existing `StateNodeDefinition`.
 * @returns The new `StateNodeConfig` resulting from applying `mapper`
 * to each state.
 */
export const mapStatesFromDefinition = <
  T extends StateNodeDefinition<any, any, any>,
  R extends StateNodeConfig<any, any, any, any>
>(
  { transitions, ...definition }: T,
  mapper: (node: MappableNodeDefinition<T>) => R
): R => {
  const mapped = mapper({ ...definition, readonlyTransitions: transitions });
  const mappedOn = mapped.on as undefined | Record<string, any>;
  const alwaysTransitions = mappedOn?.[""];
  if (alwaysTransitions) {
    delete mappedOn[""];
  }
  const alwaysTransitionsArray = !alwaysTransitions
    ? []
    : Array.isArray(alwaysTransitions)
    ? alwaysTransitions
    : [alwaysTransitions];

  return {
    ...mapped,
    always: ((mapped.always as Array<any>) ?? []).concat(
      alwaysTransitionsArray
    ),
    states: Object.keys(definition.states).reduce(
      (states, key) => ({
        ...states,
        [key]: mapStatesFromDefinition(definition.states[key] as T, mapper),
      }),
      {}
    ),
  };
};
