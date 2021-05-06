# Testing

## Jest
We use Jest JavaScript Testing Framework

<img width="200" src="https://jestjs.io/img/jest.svg">

* Jest can collect code coverage information​
* Jest support snapshot testing out of the box​
* All in One solution. Replaces Mocha, Chai, Sinon and Istanbul​
* It works with Vue.js and Node.js projects​

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

## Lint
We use ESLint for static code analyzing.

<img width="200" src="https://d33wubrfki0l68.cloudfront.net/204482ca413433c80cd14fe369e2181dd97a2a40/092e2/assets/img/logo.svg">

To execute, run

```
yarn workspaces foreach --all run lint
```
