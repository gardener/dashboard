# AGENTS.md

Backend API service for the Gardener Dashboard. Express.js with ESM modules, part of yarn monorepo workspace.

## Essential Commands

```bash
# Start development server
yarn serve

# Lint code
yarn lint

# Testing
yarn build-test-target  # Required: Transpile ESM to CommonJS for tests
yarn test              # Run tests
# Or
yarn test-coverage     # Run tests with coverage report
```
