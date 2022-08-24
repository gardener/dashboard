//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { getCertificate } = require('./helper')

const defaults = {
  global: {
    image: {
      tag: '1.26.0-dev-4d529c1'
    },
    apiServerUrl: 'https://api.garden.example.org',
    ingress: {
      annotations: {
        'nginx.ingress.kubernetes.io/ssl-redirect': 'true',
        'nginx.ingress.kubernetes.io/use-port-in-redirects': 'true',
        'kubernetes.io/ingress.class': 'nginx'
      },
      hosts: [
        'dashboard.garden.example.org',
        'dashboard.ingress.garden.example.org'
      ],
      tls: {
        secretName: 'default-gardener-dashboard-tls'
      }
    },
    terminal: {
      container: {
        image: 'ops-toolbelt:0.11.0-mod1'
      },
      gardenTerminalHost: {
        seedRef: 'soil-gcp'
      },
      garden: {
        operatorCredentials: {
          serviceAccountRef: {
            name: 'dashboard-terminal-admin',
            namespace: 'garden'
          }
        }
      },
      bootstrap: {
        disabled: true,
        seedDisabled: true,
        shootDisabled: true,
        gardenTerminalHostDisabled: true,
        gardenTerminalHost: {
          apiServerIngress: {
            annotations: {
              'cert.gardener.cloud/purpose': 'managed',
              'kubernetes.io/ingress.class': 'nginx',
              'nginx.ingress.kubernetes.io/backend-protocol': 'HTTPS'
            }
          }
        }
      }
    },
    sessionSecret: 'sessionSecret',
    secret: 'secret',
    oidc: {
      issuerUrl: 'https://identity.garden.example.org',
      clientId: 'dashboard',
      clientSecret: 'dashboardSecret',
      ca: getCertificate('...')
    },
    frontendConfig: {
      landingPageUrl: 'https://gardener.cloud/',
      helpMenuItems: [
        {
          title: 'Getting Started',
          icon: 'description',
          url: 'https://gardener.cloud/about/'
        },
        {
          title: 'slack',
          icon: 'mdi-slack',
          url: 'https://kubernetes.slack.com/messages/gardener'
        },
        {
          title: 'Issues',
          icon: 'mdi-bug',
          url: 'https://github.com/gardener/dashboard/issues/'
        }
      ],
      externalTools: [
        {
          title: 'Applications and Services Hub',
          icon: 'apps',
          url: 'https://apps.garden.example.org/foo/bar{?namespace,name}'
        }
      ]
    }
  }
}

module.exports = {
  defaults
}
