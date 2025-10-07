//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//
// CommonJS helper that lazily loads the ESM module once and exposes its APIs

let modPromise
const load = () => (modPromise ??= import('p-event'))

exports.pEvent = async (...args) => {
  const { pEvent } = await load()
  return pEvent(...args)
}

exports.pEventMultiple = async (...args) => {
  const { pEventMultiple } = await load()
  return pEventMultiple(...args)
}

exports.pEventIterator = async (...args) => {
  const { pEventIterator } = await load()
  return pEventIterator(...args)
}
