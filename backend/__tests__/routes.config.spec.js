//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  describe,
  it,
  expect,
} from 'vitest'
import { sanitizeFrontendConfig } from '../lib/routes/config.js'

describe('routes/config', () => {
  it('converts and sanitizes nested and legacy control plane HA help', async () => {
    const frontendConfig = {
      controlPlaneHighAvailabilityHelp: {
        text: '**legacy** <script>alert("legacy")</script>',
      },
      shootDefaults: {
        controlPlaneHighAvailabilityHelp: {
          text: '**nested** <img src="x" onerror="alert(1)">',
        },
      },
    }

    const sanitizedConfig = await sanitizeFrontendConfig(frontendConfig)

    expect(sanitizedConfig.controlPlaneHighAvailabilityHelp.text).toContain('<strong>legacy</strong>')
    expect(sanitizedConfig.controlPlaneHighAvailabilityHelp.text).not.toContain('<script')
    expect(sanitizedConfig.shootDefaults.controlPlaneHighAvailabilityHelp.text).toContain('<strong>nested</strong>')
    expect(sanitizedConfig.shootDefaults.controlPlaneHighAvailabilityHelp.text).not.toContain('onerror')
    expect(frontendConfig.shootDefaults.controlPlaneHighAvailabilityHelp.text).toContain('onerror')
  })
})
