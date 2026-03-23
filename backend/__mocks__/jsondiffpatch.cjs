//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

// CJS wrapper for the ESM-only jsondiffpatch package.
// Only the `diff` export is used by the backend.

// jsondiffpatch ships only ESM. This wrapper is needed so that Jest (which
// loads the compiled CJS dist) can resolve the package without triggering
// "Must use import to load ES Module".
//
// We expose a lazy async-loader via a sync facade. Because the actual tests
// for namespacedCloudProfiles run under Vitest (which handles ESM natively),
// the real jsondiffpatch is never called through this mock in production tests.
// For Jest-based tests the service module is imported as a side-effect of
// loading dist/lib/services/index.cjs; those tests mock the service layer and
// never exercise the diff call directly, so a no-op implementation is fine.

function diff (left, right) {
  // Minimal no-op diff sufficient for Jest test suite isolation.
  // Real diff logic is exercised in Vitest tests that import ESM directly.
  if (left === right) return undefined
  return { _placeholder: true }
}

module.exports = { diff }
