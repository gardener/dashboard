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
 * @returns {Promise<void>} A promise that resolves when the module is mocked.
 */
export async function spyOnHelper (moduleName, methodPaths, importMetaUrl = false) {
  if (importMetaUrl) {
    moduleName = moduleResolve(importMetaUrl, moduleName)
  }

  const { default: actual } = await import(moduleName)

  for (const method of methodPaths) {
    if (method.includes('.')) {
      const parts = method.split('.')
      const property = parts.pop() // Get the last part (e.g., 'inc')
      const parent = parts.reduce((obj, key) => obj[key], actual)
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

/**
 * @param {string} moduleName
 * @param {string[]} methodPaths
 * @param {boolean} importMetaUrl
 */
export async function spyOnHelperMocked (moduleName, methodPaths, importMetaUrl = false) {
  const spy = await spyOnHelper(moduleName, methodPaths, importMetaUrl)
  jest.unstable_mockModule(moduleName, () => {
    return {
      default: spy,
    }
  })
}

/**
 * Partial mock on the specified methods or properties.
 *
 * @param {string} moduleName - The name of the module to mock.
 * @param {string[]} methodPaths - An array of method paths to mock. Each path should be a dot-separated string
 *                                 representing the method's location within the module (e.g., "connectionsCount.inc").
 * @returns {Promise<void>} A promise that resolves when the module is mocked.
 */
export async function mockOnHelper (moduleName, methodPaths, importMetaUrl = false) {
  if (importMetaUrl) {
    moduleName = moduleResolve(importMetaUrl, moduleName)
  }

  const { default: actual } = await import(moduleName)

  for (const method of methodPaths) {
    if (method.includes('.')) {
      const parts = method.split('.')
      const property = parts.pop() // Get the last part (e.g., 'inc')
      const parent = parts.reduce((obj, key) => obj[key], actual)
      parent[property] = jest.fn()
      if (parent[property] === 'constructor') {
        parent[property] = jest.fn().mockImplementation()
      }
    } else {
      return {
        default: jest.fn(),
      }
    }
  }
  return {
    default: actual,
  }
}

/**
 * Partial spy on the specified methods or properties.
 *
 * @param {string} moduleName - The name of the module to mock.
 * @param {string[]} methodPaths - An array of method paths to spy. Each path should be a dot-separated string
 *                                 representing the method's location within the module (e.g., "connectionsCount.inc").
 * @returns {Promise<void>} A promise that resolves when the module is mocked.
 */
export async function semiAutoMockHelper (moduleName, methodPaths, importMetaUrl = false) {
  if (importMetaUrl) {
    moduleName = moduleResolve(importMetaUrl, moduleName)
  }

  const { default: actual } = await import(moduleName)
  // TOdo invert for better readability
  jest.unstable_mockModule(moduleName, () => {
    for (const method of methodPaths) {
      if (method.includes('.')) {
        const parts = method.split('.')
        const property = parts.pop() // Get the last part (e.g., 'inc')
        const parent = parts.reduce((obj, key) => obj[key], actual)
        parent[property] = jest.fn()
      } else {
        return {
          default: jest.fn(),
        }
      }
    }
    return {
      default: actual,
    }
  })
}

export function moduleResolve (importMetaUrl, modulePath) {
  const require = createRequire(importMetaUrl)
  const path = require.resolve(modulePath)
  return path
}

/**
 * Creates a mock version of a module without using jest.mock.
 *
 * @param {object} module - The module to mock.
 * @returns {object} A mocked version of the module.
 */
export function createMockModule (module, maxDepth = 2, currentDepth = 0) {
  if (currentDepth >= maxDepth) {
    return {} // Stop recursion if max depth is reached
  }
  const mock = {}

  for (const key of Object.keys(module)) {
    if (!Object.prototype.hasOwnProperty.call(module, key)) {
      continue // Skip invalid keys
    }

    const value = module[key]

    if (typeof value === 'function') {
      // Replace functions with jest.fn
      mock[key] = jest.fn()
    } else if (typeof value === 'object' && value !== null) {
      // Recursively mock nested objects, limiting depth
      mock[key] = createMockModule(value, maxDepth, currentDepth + 1)
    } else {
      // Preserve non-function values
      mock[key] = value
    }
  }

  return mock
}
