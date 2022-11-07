import {
  StateMachine,
  StateNode,
  StateNodeConfig,
  StateNodeDefinition,
} from "xstate";

export const mapStates = <
  T extends
    | StateNode<any, any, any, any, any, any>
    | StateMachine<any, any, any, any, any, any, any>
>(
  root: T,
  mapper: (
    node: Omit<T["definition"], "transitions"> & {
      readonlyTransitions: T["definition"]["transitions"];
    }
  ) => T["config"]
): T["config"] => {
  const machineDefinition = mapStatesFromDefinition(root.definition, mapper);
  return machineDefinition;
};

export const mapStatesFromDefinition = <
  T extends StateNodeDefinition<any, any, any>,
  R extends StateNodeConfig<any, any, any, any>
>(
  { transitions, ...definition }: T,
  mapper: (
    node: Omit<T, "transitions"> & { readonlyTransitions: T["transitions"] }
  ) => R
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
