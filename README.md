# @simplystated/f-of-xstate &middot; [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/simplystated/f-of-xstate/blob/main/LICENSE) [![npm version](https://img.shields.io/npm/v/@simplystated/f-of-xstate.svg?style=flat)](https://www.npmjs.com/package/@simplystated/f-of-xstate) [![CI](https://github.com/simplystated/f-of-xstate/actions/workflows/ci.yaml/badge.svg)](https://github.com/simplystated/f-of-xstate/actions/workflows/ci.yaml)

Tools for operating on [XState](https://github.com/statelyai/xstate) state machines as data.

Query and update your statechart structure.

![Logo](https://github.com/simplystated/f-of-xstate/raw/main/f-of-xstate.png)

# Pronounciation

Eff of ex state.
As in: `f(x-state)`, because it's a set of utilities to operate on XState state charts as data.

# Motivation

Statecharts are awesome.
A lot of that reputation comes from the fact that they make it far easier to reason about your logic, making hard problems tractable.
However, one of the too-often overlooked benefits of representing your logic as data is that once you do that... well... your logic is data!
Once your logic is data, you can live out every lisp programmer's dream and write programs to inspect, modify, and even generate your programs.
That's where f-of-xstate comes in.
We aim to provide a set of utilities to make that easy.

# Installation

```bash
yarn add @simplystated/f-of-xstate
```

or

```bash
npm install --save @simplystated/f-of-xstate
```

# API Documentation

Please find our API Documentation [here](https://simplystated.github.io/f-of-xstate/).

# Testing

f-of-xstate ships with a [fast-check](https://github.com/dubzzz/fast-check) [Arbitrary](https://github.com/dubzzz/fast-check/blob/main/packages/fast-check/documentation/Arbitraries.md) to generate random XState state machine configurations (e.g. the things you can pass to `createMachine`).

The intention is that this should make it easier to use property-based testing to gain confidence in the correctness of your state machine transformations.
All of the functions exposed in this package make use of this arbitrary for testing.
You can find examples [here](https://github.com/simplystated/f-of-xstate/tree/main/tests).

You can find the documentation for the machine arbitrary [here](https://simplystated.github.io/f-of-xstate/variables/arbitrary_machine.arbitraryMachine.html).

Note: `arbitraryMachine` is not exported from index of f-of-xstate because it is intended to be used for testing and we didn't want to mix it with production code.
You can import it as:
```typescript
import { arbitraryMachine } from "@simplystated/f-of-xstate/dist/arbitrary-machine"
```

# Querying

Given a `StateMachine` (e.g. something returned from XState's `createMachine`), you can query for the following, each of which walks the tree of state nodes and returns an array of all items encountered:
 - [`getAllStates`](https://simplystated.github.io/f-of-xstate/functions/index.getAllStates.html)
 - [`getAllProperStates`](https://simplystated.github.io/f-of-xstate/functions/index.getAllProperStates.html)
 - [`getAllActions`](https://simplystated.github.io/f-of-xstate/functions/index.getAllActions.html)
 - [`getAllConditions`](https://simplystated.github.io/f-of-xstate/functions/index.getAllConditions.html)
 - [`getAllInvocations`](https://simplystated.github.io/f-of-xstate/functions/index.getAllInvocations.html)
 - [`getAllTransitions`](https://simplystated.github.io/f-of-xstate/functions/index.getAllTransitions.html)

# Transforming

Given a `StateMachine`, f-of-xstate provides utilities to map over its states, supplying a function to transform each state to produce a new machine config (suitable to pass to `createMachine`).

See:
 - [`mapStates`](https://simplystated.github.io/f-of-xstate/functions/index.mapStates.html)

f-of-xstate also provides some utility mappers for common transformations that can be used with `mapStates`:
 - [`appendActionsToAllTransitions`](https://simplystated.github.io/f-of-xstate/functions/index.appendActionsToAllTransitions.html)

Example:

```typescript
import { createMachine, actions } from "xstate";
import { mapStates, appendActionsToAllTransitions } from "@simplystated/f-of-xstate";
const machine = createMachine(...);
const config = mapStates(
  machine,
  appendActionsToAllTransitions([
    actions.log((_, evt) => `Hello ${evt.type}`)
  ])
);
// The updated machine will now log `Hello <event>` for every event.
const updatedMachine = createMachine(config);
```

# Simply Stated

f-of-xstate is a utility library built by [Simply Stated](https://www.simplystated.dev).
At Simply Stated, our goal is to help to unlock the power of statecharts for everyone.

![Logo](https://github.com/simplystated/f-of-xstate/raw/main/simply-stated.png)

# License

f-of-xstate is [MIT licensed](https://github.com/simplystated/f-of-xstate/blob/main/LICENSE).
