//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const fs = require('fs')
const path = require('path')
const os = require('os')
const yaml = require('js-yaml')
const { load, dumpKubeconfig, fromKubeconfig, getInCluster, cleanKubeconfig, parseKubeconfig, constants } = require('../lib')
const Config = require('../lib/Config')
const { mockGetToken } = require('gtoken')
const { cloneDeep } = require('lodash')

describe('kube-config', () => {
  const server = new URL('https://kubernetes:6443')
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwic3ViIjoic3lzdGVtOnNlcnZpY2VhY2NvdW50OmdhcmRlbjpkZWZhdWx0In0.-4rSuvvj5BStN6DwnmLAaRVbgpl5iCn2hG0pcqx0NPw'
  const ca = 'ca'
  const clientCertificate = 'client-certificate'
  const clientKey = 'client-key'
  const caData = Buffer.from(ca, 'utf8').toString('base64')
  const namespace = 'default'
  const cluster = 'cluster'
  const user = 'user'
  const username = 'username'
  const password = 'secret'
  const currentContext = 'default'
  const accessToken = 'access-token'

  beforeEach(() => {
    jest.spyOn(fs, 'readFileSync')
  })

  afterEach(() => {
    fs.readFileSync.mockRestore()
  })

  describe('#load', () => {
    it('should return the test config', () => {
      const config = load()
      expect(config).toEqual({
        url: server.origin,
        rejectUnauthorized: true,
        auth: {
          bearer: token
        }
      })
    })

    it('should return the in cluster config', () => {
      fs.readFileSync
        .mockReturnValueOnce(token)
        .mockReturnValueOnce(ca)
      const config = load({
        NODE_ENV: 'development',
        KUBERNETES_SERVICE_HOST: server.hostname,
        KUBERNETES_SERVICE_PORT: server.port
      })
      expect(fs.readFileSync).toHaveBeenCalledTimes(2)
      expect(fs.readFileSync.mock.calls).toEqual([
        ['/var/run/secrets/kubernetes.io/serviceaccount/token', 'utf8'],
        ['/var/run/secrets/kubernetes.io/serviceaccount/ca.crt', 'utf8']
      ])
      expect(config).toEqual({
        url: server.origin,
        ca,
        rejectUnauthorized: true,
        auth: { bearer: token }
      })
    })

    it('should return the config from KUBECONFIG environment variable', () => {
      const kubeconfig = dumpKubeconfig({
        userName: user,
        namespace,
        token,
        server: server.origin,
        caData
      })
      fs.readFileSync.mockReturnValue(kubeconfig)
      const config = load({
        NODE_ENV: 'development',
        KUBECONFIG: '/path/to/kube/config:/path/to/another/kube/config'
      })
      expect(fs.readFileSync).toHaveBeenCalledTimes(1)
      expect(fs.readFileSync.mock.calls[0]).toEqual(['/path/to/kube/config'])
      expect(config).toEqual({
        url: server.origin,
        ca,
        rejectUnauthorized: true,
        auth: { bearer: token }
      })
    })

    it('should dump KUBECONFIG without providing a ca', () => {
      const kubeconfig = yaml.load(dumpKubeconfig({
        userName: user,
        namespace,
        token,
        server: server.origin
      }))
      expect(kubeconfig.clusters).toHaveLength(1)
      const cluster = kubeconfig.clusters[0]
      expect(cluster).not.toHaveProperty('certificate-authority-data')
    })

    it('should return the config from the users homedir', () => {
      const defaultKubeconfigPath = path.join(os.homedir(), '.kube', 'config')
      const kubeconfig = yaml.dump({
        apiVersion: 'v1',
        kind: 'Config',
        clusters: [{
          name: cluster,
          cluster: {
            server: server.origin,
            'insecure-skip-tls-verify': false,
            'certificate-authority': '/path/to/ca.crt'
          }
        }],
        contexts: [{
          name: currentContext,
          context: {
            cluster,
            user
          }
        }],
        'current-context': currentContext,
        users: [{
          name: user,
          user: {
            'client-certificate': '/path/to/client.crt',
            'client-key': '/path/to/client.key'
          }
        }]
      })
      fs.readFileSync.mockImplementation(path => {
        switch (path) {
          case defaultKubeconfigPath:
            return kubeconfig
          case '/path/to/ca.crt':
            return ca
          case '/path/to/client.crt':
            return clientCertificate
          case '/path/to/client.key':
            return clientKey
        }
      })
      const config = load({
        NODE_ENV: 'development'
      })
      expect(config).toEqual({
        url: server.origin,
        ca,
        rejectUnauthorized: true,
        cert: clientCertificate,
        key: clientKey
      })
    })
  })

  describe('#fromKubeconfig', () => {
    const defaultKubeconfig = {
      apiVersion: 'v1',
      kind: 'Config',
      clusters: [],
      contexts: [{
        name: currentContext,
        context: {
          cluster,
          user
        }
      }],
      'current-context': currentContext,
      users: [{
        name: user,
        user: {
          token
        }
      }]
    }
    let kubeconfig

    beforeEach(() => {
      kubeconfig = cloneDeep(defaultKubeconfig)
    })

    it('should return a clean config', () => {
      kubeconfig.clusters.push({
        name: cluster,
        cluster: {
          server: server.origin,
          'certificate-authority': '/path/to/ca.crt'
        }
      })
      kubeconfig = yaml.dump(kubeconfig)
      fs.readFileSync.mockImplementation(path => {
        switch (path) {
          case '/path/to/ca.crt':
            return ca
        }
      })
      const config = fromKubeconfig(kubeconfig)
      expect(config).toEqual({
        url: server.origin,
        rejectUnauthorized: true,
        auth: { bearer: token }
      })
    })

    it('should return a config with token', () => {
      const config = fromKubeconfig(kubeconfig)
      expect(config).toEqual({
        rejectUnauthorized: true,
        auth: { bearer: token }
      })
    })

    it('should return a config with username and password', () => {
      kubeconfig.users[0].user = {
        username,
        password
      }
      const config = fromKubeconfig(kubeconfig)
      expect(config).toEqual({
        rejectUnauthorized: true,
        auth: {
          user: username,
          pass: password
        }
      })
    })

    it('should return a config with keyData and certData', () => {
      const base64Encode = data => Buffer.from(data, 'utf8').toString('base64')
      kubeconfig.users[0].user = {
        'client-key-data': base64Encode('key'),
        'client-certificate-data': base64Encode('cert')
      }
      const config = fromKubeconfig(kubeconfig)
      expect(config).toEqual({
        rejectUnauthorized: true,
        key: 'key',
        cert: 'cert'
      })
    })

    it('should fail to parse the kubeconfig', () => {
      expect(() => fromKubeconfig()).toThrow(TypeError)
    })

    it('should return a config with a valid gcp auth-provider', () => {
      const authProvider = {
        config: {
          'access-token': accessToken,
          expiry: new Date(Date.now() + 86400000).toISOString()
        },
        name: 'gcp'
      }
      kubeconfig.users[0].user = {
        'auth-provider': authProvider
      }
      const config = fromKubeconfig(kubeconfig)
      expect(config).toEqual({
        rejectUnauthorized: true,
        auth: { bearer: accessToken }
      })
    })

    it('should return a config with gcp auth-provider without auth-provider-config', () => {
      kubeconfig.users[0].user = {
        'auth-provider': {
          name: 'gcp'
        }
      }
      const config = fromKubeconfig(kubeconfig)
      expect(config).toEqual({
        rejectUnauthorized: true
      })
    })

    it('should return a config with an expired gcp auth-provider', () => {
      kubeconfig.users[0].user = {
        'auth-provider': {
          config: {
            'access-token': accessToken
          },
          name: 'gcp'
        }
      }
      const config = fromKubeconfig(kubeconfig)
      expect(config).toEqual({
        rejectUnauthorized: true
      })
    })

    it('should return a config with unsupported user', () => {
      kubeconfig.users[0].user = {}
      const config = fromKubeconfig(kubeconfig)
      expect(config).toEqual({
        rejectUnauthorized: true
      })
    })
  })

  describe('#getInCluster', () => {
    const noEntityError = path => {
      Object.assign(new Error(`ENOENT: no such file or directory, open '${path}'`), {
        code: 'ENOENT',
        path
      })
    }
    it('should fail with "kubernetes service endpoint not defined"', () => {
      expect(() => getInCluster()).toThrow(/kubernetes service endpoint not defined$/)
    })

    it('should fail with "serviceaccount token not found"', () => {
      fs.readFileSync
        .mockImplementationOnce(noEntityError(constants.KUBERNETES_SERVICEACCOUNT_TOKEN_FILE))
      expect(() => getInCluster({
        KUBERNETES_SERVICE_HOST: server.hostname,
        KUBERNETES_SERVICE_PORT: server.port
      })).toThrow(/serviceaccount token not found$/)
    })

    it('should fail with "serviceaccount certificate authority not found"', () => {
      fs.readFileSync
        .mockReturnValueOnce(token)
        .mockImplementationOnce(noEntityError(constants.KUBERNETES_SERVICEACCOUNT_CA_FILE))
      expect(() => getInCluster({
        KUBERNETES_SERVICE_HOST: server.hostname,
        KUBERNETES_SERVICE_PORT: server.port
      })).toThrow(/serviceaccount certificate authority not found$/)
    })
  })

  describe('#cleanKubeconfig', () => {
    const authProvider = {
      config: {
        'access-token': accessToken
      },
      name: 'gcp'
    }
    const defaultInput = {
      contexts: [{
        name: currentContext,
        context: {
          user
        }
      }],
      'current-context': currentContext,
      users: [{
        name: user,
        user: {
          'auth-provider': authProvider
        }
      }]
    }

    let input
    beforeEach(() => {
      input = cloneDeep(defaultInput)
    })

    it('should keep auth-provider with name "gcp"', () => {
      const kubeconfig = cleanKubeconfig(input)
      expect(kubeconfig.users).toHaveLength(1)
      const { user } = kubeconfig.users[0]
      expect(user['auth-provider']).toEqual(authProvider)
    })

    it('should remove auth-provider with unknown names', () => {
      input.users[0].user['auth-provider'].name = 'unknown'
      const kubeconfig = cleanKubeconfig(input)
      expect(kubeconfig.users).toHaveLength(1)
      const { user } = kubeconfig.users[0]
      expect(user['auth-provider']).toBeUndefined()
    })
  })

  describe('#parseKubeconfig', () => {
    it('should return the input object instance', () => {
      const input = Config.build({}, undefined)
      const kubeconfig = parseKubeconfig(input)
      expect(kubeconfig).toBe(input)
    })
  })

  describe('#refreshAuthProviderConfig', () => {
    const defaultInput = {
      contexts: [{
        name: currentContext,
        context: {
          user
        }
      }],
      'current-context': currentContext,
      users: [{
        name: user,
        user: {
          'auth-provider': {
            config: {
              'access-token': accessToken
            },
            name: 'gcp'
          }
        }
      }]
    }
    const credentials = {
      private_key: 'key',
      client_email: 'iss'
    }

    let input
    beforeEach(() => {
      mockGetToken.mockClear()
      input = cloneDeep(defaultInput)
    })

    it('should refresh an existing auth-provider token', async () => {
      const kubeconfig = parseKubeconfig(input)
      await kubeconfig.refreshAuthProviderConfig(credentials)
      expect(mockGetToken).toBeCalledTimes(1)
      expect(kubeconfig.users).toHaveLength(1)
      const authProvider = kubeconfig.currentUser['auth-provider']
      expect(authProvider.name).toBe('gcp')
      expect(authProvider.config['access-token']).toBe('valid-access-token')
      expect(new Date(authProvider.config.expiry).getTime()).toBeGreaterThan(Date.now())
    })

    it('should create an auth-provider token', async () => {
      delete input.users[0].user['auth-provider'].config
      const kubeconfig = parseKubeconfig(input)
      await kubeconfig.refreshAuthProviderConfig(credentials)
      expect(mockGetToken).toBeCalledTimes(1)
      expect(kubeconfig.users).toHaveLength(1)
      const authProvider = kubeconfig.currentUser['auth-provider']
      expect(authProvider.config['access-token']).toBe('valid-access-token')
    })

    it('should passthrough input without an auth-provider', async () => {
      delete input.users[0].user['auth-provider']
      const kubeconfig = parseKubeconfig(input)
      await kubeconfig.refreshAuthProviderConfig(credentials)
      expect(mockGetToken).toBeCalledTimes(0)
      expect(kubeconfig.toJSON()).toMatchObject(input)
    })
  })
})
