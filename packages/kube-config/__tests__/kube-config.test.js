//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const fs = require('fs')
const path = require('path')
const os = require('os')
const yaml = require('js-yaml')
const { load, dumpKubeconfig, fromKubeconfig, getInCluster } = require('../lib')

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

  beforeEach(() => {
    jest.spyOn(fs, 'readFileSync')
  })

  it('should return the test config', () => {
    const config = load()
    expect(config).toEqual({
      url: server.origin,
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
      user,
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

  it('should return the config from the users homedir', () => {
    const defaultKubeconfigPath = path.join(os.homedir(), '.kube', 'config')
    const kubeconfig = yaml.safeDump({
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

  it('should return a clean config', () => {
    const kubeconfig = yaml.safeDump({
      apiVersion: 'v1',
      kind: 'Config',
      clusters: [{
        name: cluster,
        cluster: {
          server: server.origin,
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
          token
        }
      }]
    })
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
    const kubeconfig = {
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
          token
        }
      }]
    }
    const config = fromKubeconfig(kubeconfig)
    expect(config).toEqual({
      rejectUnauthorized: true,
      auth: { bearer: token }
    })
  })

  it('should return a config with username and password', () => {
    const kubeconfig = {
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
          username,
          password
        }
      }]
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

  it('should fail to parse the kubeconfig', () => {
    expect(() => fromKubeconfig()).toThrow(TypeError)
  })

  it('should fail to load in cluster config', () => {
    fs.readFileSync
      .mockReturnValueOnce(token)
      .mockReturnValue()
    expect(() => getInCluster()).toThrow(/kubernetes service endpoint not defined$/)
    expect(() => getInCluster({
      KUBERNETES_SERVICE_HOST: server.hostname,
      KUBERNETES_SERVICE_PORT: server.port
    })).toThrow(/serviceaccount certificate authority not found$/)
    expect(() => getInCluster({
      KUBERNETES_SERVICE_HOST: server.hostname,
      KUBERNETES_SERVICE_PORT: server.port
    })).toThrow(/serviceaccount token not found$/)
  })
})
