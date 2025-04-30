//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { jest } from '@jest/globals'
import { createRequire } from 'node:module'

/**
 * Partial spy on the specified methods or properties.
 *
 * @param {string} moduleName - The name of the module to mock.
 * @param {string[]} methodPaths - An array of method paths to spy. Each path should be a dot-separated string
 *                                 representing the method's location within the module (e.g., "connectionsCount.inc").
 * @param importMetaUrl
 * @returns {Promise<void>} A promise that resolves when the module is mocked.
 */
export async function spyOnHelper (moduleName, methodPaths, importMetaUrl = '') {
  if (importMetaUrl) {
    moduleName = moduleResolve(importMetaUrl, moduleName)
  }

  const { default: actual } = await import(moduleName)

  for (const method of methodPaths) {
    if (method.includes('.')) {
      const parts = method.split('.')
      const property = parts.pop() // Get the last part (e.g., 'inc')
      // eslint-disable-next-line security/detect-object-injection
      const parent = parts.reduce((obj, key) => obj[key], actual)
      // eslint-disable-next-line security/detect-object-injection
      parent[property] = jest.fn(parent[property])
    } else {
      return {
        default: jest.fn(actual),
      }
    }
  }
  return {
    default: actual,
  }
}

export function moduleResolve (importMetaUrl, modulePath) {
  const require = createRequire(importMetaUrl)
  return require.resolve(modulePath)
}
