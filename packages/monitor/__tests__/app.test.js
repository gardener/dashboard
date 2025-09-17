//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import promClient from 'prom-client'

describe('app', () => {
  it('should clear register on destroy', async () => {
    const { default: app } = await import('../lib/app.js')
    app.destroy()
    expect(promClient.register.clear).toHaveBeenCalledTimes(1)
  })
})
