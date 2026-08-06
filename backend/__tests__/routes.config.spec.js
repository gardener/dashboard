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
  it('handles a null branding configuration', async () => {
    const frontendConfig = {
      branding: null,
    }

    await expect(sanitizeFrontendConfig(frontendConfig)).resolves.toEqual(frontendConfig)
  })

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

  it('converts and sanitizes configured vendor secret help', async () => {
    const frontendConfig = {
      branding: {
        infraVendors: [
          {
            name: 'custom-infra',
            secret: {
              help: [
                '**Infrastructure help**',
                '<img src="x" onerror="alert(1)">',
                '[unsafe](javascript:alert(1))',
              ].join('\n'),
            },
          },
        ],
        dnsVendors: [
          {
            name: 'custom-dns',
            secret: {
              help: [
                '<p>DNS <strong>help</strong></p>',
                '<script>alert("dns")</script>',
                '<a href="https://example.org/docs">Documentation</a>',
              ].join('\n'),
            },
          },
        ],
      },
    }

    const sanitizedConfig = await sanitizeFrontendConfig(frontendConfig)
    const infraHelp = sanitizedConfig.branding.infraVendors[0].secret.help
    const dnsHelp = sanitizedConfig.branding.dnsVendors[0].secret.help

    expect(infraHelp).toContain('<strong>Infrastructure help</strong>')
    expect(infraHelp).not.toContain('onerror')
    expect(infraHelp).not.toContain('javascript:')
    expect(dnsHelp).toContain('<strong>help</strong>')
    expect(dnsHelp).toContain('href="https://example.org/docs"')
    expect(dnsHelp).not.toContain('<script')
    expect(frontendConfig.branding.infraVendors[0].secret.help).toContain('onerror')
    expect(frontendConfig.branding.dnsVendors[0].secret.help).toContain('<script')
  })
})
