//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const mockMonitor = jest.createMockFromModule('@gardener-dashboard/monitor')

mockMonitor.monitorResponseTimes.mockImplementation(() => {
  return (req, res, next) => next()
})

mockMonitor.destroy = jest.fn()

module.exports = mockMonitor
