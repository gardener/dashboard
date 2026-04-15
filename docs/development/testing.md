<!--
SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

# Testing

## Vitest
We use [Vitest](https://vitest.dev/) as our testing framework.

* Vitest collects code coverage information via `@vitest/coverage-v8`
* Vitest supports snapshot testing out of the box
* It works with Vue.js (jsdom environment) and Node.js projects
* Each workspace has its own `vitest.config.js`

To execute all tests, simply run
```
yarn workspaces foreach --all run test
```

or to include test coverage generation
```
yarn workspaces foreach --all run test-coverage
```

You can also run tests for frontend, backend and charts directly inside the respective folder via
```
yarn test
```

### VS Code Integration
We recommend the [Vitest extension](https://marketplace.visualstudio.com/items?itemName=vitest.explorer) for running and debugging tests directly from the editor.
See `.vscode/extensions.json` for all recommended extensions.

## Lint
We use ESLint for static code analyzing.

<img width="200" src="https://d33wubrfki0l68.cloudfront.net/204482ca413433c80cd14fe369e2181dd97a2a40/092e2/assets/img/logo.svg">

To execute, run

```
yarn workspaces foreach --all run lint
```
