//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { toHex, toBase64, gardenerConfigPath } = require('./helper')

const ca = [
  '-----BEGIN CERTIFICATE-----',
  toBase64('...'),
  '-----END CERTIFICATE-----'
].join('\n')

const defaultConfigPath = gardenerConfigPath()
const defaultConfig = {
  port: 3030,
  logLevel: 'info',
  logFormat: 'text',
  apiServerUrl: 'https://kubernetes.external.foo.bar',
  apiServerCaData: toBase64(ca),
  tokenRequestAudiences: ['aud1', 'aud2'],
  experimentalUseWatchCacheForListShoots: 'no',
  gitHub: {
    apiUrl: 'https://api.github.com',
    org: 'gardener',
    repository: 'ticket-dev',
    webhookSecret: toHex('webhook-secret'),
    authentication: {
      token: toHex('token')
    }
  },
  sessionSecret: toHex('session-secret'),
  oidc: {
    issuer: 'https://kubernetes:32001',
    rejectUnauthorized: true,
    ca,
    client_id: 'dashboard',
    client_secret: toHex('dashboard-secret'),
    redirect_uris: [
      'http://localhost:8080/auth/callback'
    ],
    scope: 'openid email profile groups audience:server:client_id:dashboard audience:server:client_id:kube-kubectl',
    clockTolerance: 42,
    public: {
      clientId: 'kube-kubectl',
      clientSecret: toHex('kube-kubectl-secret')
    }
  },
  terminal: {
    container: {
      image: 'dummyImage:1.0.0'
    },
    containerImageDescriptions: [
      {
        image: '/dummyImage:.*/',
        description: 'Dummy Image Description'
      },
      {
        image: 'fooImage:0.1.2',
        description: 'Foo Image Description'
      }
    ],
    gardenTerminalHost: {
      seedRef: 'infra1-seed2'
    },
    garden: {
      operatorCredentials: {
        serviceAccountRef: {
          name: 'dashboard-terminal-admin',
          namespace: 'garden'
        }
      }
    }
  },
  unreachableSeeds: {
    matchLabels: {
      'test-unreachable': 'true'
    }
  },
  frontend: {
    features: {
      terminalEnabled: true
    },
    helpMenuItems: [
      {
        title: 'Getting Started',
        icon: 'description',
        url: 'https://gardener.cloud/about/'
      },
      {
        title: 'Feedback',
        icon: 'mdi-slack',
        url: 'https://kubernetes.slack.com/messages/gardener/'
      },
      {
        title: 'Issues',
        icon: 'mdi-bug',
        url: 'https://github.com/gardener/dashboard/issues/'
      }
    ],
    serviceAccountDefaultTokenExpiration: 42
  }
}

const configMap = new Map()

configMap.set(defaultConfigPath, defaultConfig)

configMap.set('/etc/gardener/1/config.yaml', {
  port: 1234
})

configMap.set('/etc/gardener/2/config.yaml', {
  port: 1234,
  logLevel: 'info'
})

configMap.set('/etc/gardener/3/config.yaml', {
  sessionSecret: undefined
})

configMap.set('/etc/gardener/4/config.yaml', {
  oidc: {
    ...defaultConfig.oidc
  }
})

module.exports = {
  default: defaultConfig,
  get (key) {
    return configMap.get(key || defaultConfigPath)
  },
  list () {
    return Array.from(configMap.entries())
  }
}
