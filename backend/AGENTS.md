# AGENTS.md

Backend API service for the Gardener Dashboard. Express.js with ESM modules, part of yarn monorepo workspace.

## Essential Commands

```bash
# Start development server
yarn serve

# Lint code
yarn lint

# Testing (CRITICAL - run in sequence)
yarn build-test-target  # First transpile ESM to CommonJS
yarn test              # Then run tests
yarn test-coverage     # Run tests with coverage
```
