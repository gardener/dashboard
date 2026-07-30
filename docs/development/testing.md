# Testing

## Vitest
We use [Vitest](https://vitest.dev/) as our testing framework.

* Vitest collects code coverage information via `@vitest/coverage-v8`
* Vitest supports snapshot testing out of the box
* It works with Vue.js (jsdom environment) and Node.js projects
* Each workspace and the `hack/` CLI boundary has its own Vitest configuration

To execute all tests, simply run
```
make test
```

or to include test coverage generation
```
make test-cov
```

You can also run tests for frontend, backend and charts directly inside the respective folder via
```
yarn test
```

The UI-verification CLI has an independent Node test suite under `hack/`.
Run it directly with:

```
yarn test:hack
yarn test:hack:cov
```

### VS Code Integration
We recommend the [Vitest extension](https://marketplace.visualstudio.com/items?itemName=vitest.explorer) for running and debugging tests directly from the editor.
See `.vscode/extensions.json` for all recommended extensions.

## Lint
We use ESLint for static code analyzing.

<img width="200" src="https://d33wubrfki0l68.cloudfront.net/204482ca413433c80cd14fe369e2181dd97a2a40/092e2/assets/img/logo.svg">

To execute, run

```
make lint
```

Run only the UI-verification CLI lint boundary with `yarn lint:hack`.
