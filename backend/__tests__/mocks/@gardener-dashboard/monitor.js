//
// SPDX-FileCopyrightText: Copyright Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { vi } from 'vitest'

const { default: monitorActual } = await vi.importActual('@gardener-dashboard/monitor')

const monitorResponseTimes = vi.fn().mockImplementation(() => {
  return (req, res, next) => next()
})

const monitorHttpServer = vi.fn()
const monitorSocketIO = vi.fn()

const destroy = vi.fn()

const mockModule = {
  ...monitorActual,
  monitorResponseTimes,
  monitorHttpServer,
  monitorSocketIO,
  destroy,
}

export default mockModule
export {
  monitorResponseTimes,
  monitorHttpServer,
  monitorSocketIO,
  destroy,
}
