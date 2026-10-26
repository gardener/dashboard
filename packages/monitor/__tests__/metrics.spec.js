//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import metrics from '../lib/metrics.js'

describe('metrics', () => {
  it('should create and export the application defined metrics', () => {
    expect(Object.keys(metrics)).toMatchSnapshot()
  })

  it('should collect registered cache item counts when scraped', async () => {
    metrics.registerCacheCollector('test', () => 42)

    const { values } = await metrics.cachedItemsCount.get()

    expect(values).toContainEqual({ labels: { cache: 'test' }, value: 42 })
  })
})
