# Local Gardener Dashboard

`node hack/local-dashboard.mjs` manages an isolated local Gardener Dashboard environment for development and deterministic browser verification. The initial implementation starts the complete Garden API, backend, and frontend stack without using ambient kubeconfig or Dashboard configuration.

The local Garden API is implemented with gardenerless/KCP. It is not a complete Garden cluster.

## Prerequisites

Install the repository dependencies and create the trusted frontend development certificate:

```sh
yarn
yarn workspace @gardener-dashboard/frontend setup
```

## Quick start

```sh
node hack/local-dashboard.mjs setup
node hack/local-dashboard.mjs up
```

Open `https://127.0.0.1:8444`. Run `node hack/local-dashboard.mjs token` when a login token is needed, and stop the stack with `node hack/local-dashboard.mjs down`.

## Setup

`setup` idempotently prepares the pinned gardenerless checkout and local Garden API runtime under `.local-dashboard`. Detailed output is written to `.local-dashboard/setup.log`.

To reset the managed checkout and runtime:

```sh
node hack/local-dashboard.mjs setup --reset
```

## Commands

```sh
node hack/local-dashboard.mjs up
node hack/local-dashboard.mjs up --scenario failing-shoot
```

Starts the stack and reports the frontend URL. Available scenarios are:

- `healthy-shoot` (default): the `pine-oak` Shoot is healthy
- `failing-shoot`: the `pine-oak` Shoot is failing
- `many-shoots`: a bounded deterministic Shoot set is present
- `operation-in-progress`: the `pine-oak` Shoot has an active operation

```sh
node hack/local-dashboard.mjs status
```

Reports stack health and managed prerequisite versions.

```sh
node hack/local-dashboard.mjs token
```

Prints a login token for the operator service account `garden/dashboard-user` by default.

```sh
node hack/local-dashboard.mjs token | pbcopy
```

For landscape viewer access, copy a token for `garden/landscape-viewer`:

```sh
node hack/local-dashboard.mjs token --namespace garden --name landscape-viewer | pbcopy
```

```sh
node hack/local-dashboard.mjs down
```

Stops the stack.

## Accessing the local Garden API

The bundled kubectl wrapper automatically targets the managed local Garden API, so no manual kubeconfig configuration is required:

```sh
./hack/local-dashboard/bin/kubectl-gardenerless get shoots -A
./hack/local-dashboard/bin/kubectl-gardenerless get projects
```

No `PATH` change is required for direct invocation. To use the wrapper as `kubectl gardenerless` with shell completion, add the wrapper directory to `PATH`:

```sh
export PATH="$PWD/hack/local-dashboard/bin:$PATH"
kubectl gardenerless get shoots -A
kubectl gardenerless get projects
```

## Managed resources

The workflow uses these managed paths and fixed loopback endpoints:

- gardenerless checkout: `.local-dashboard/gardenerless`
- local Garden API runtime: `.local-dashboard/runtime`
- frontend: `https://127.0.0.1:8444`
- backend: `http://127.0.0.1:3031` (metrics on port `9051`)
- garden: `https://127.0.0.1:6443`

Managed components are presented as `garden`, `backend`, and `frontend`.
