//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const Config = require('../lib/Config')
const ClientConfig = require('../lib/ClientConfig')
const { encodeBase64, onceEvent } = fixtures.helper

describe('client-config', () => {
  let context
  let user
  let cluster
  let kubeconfig
  let clientConfig

  const initClientConfig = signal => {
    const config = new Config(kubeconfig)
    const reactive = !!signal
    clientConfig = new ClientConfig(config, { reactive, signal })
    return reactive
      ? onceEvent(clientConfig.watcher, 'ready')
      : Promise.resolve()
  }

  beforeEach(() => {
    cluster = {
      server: 'https://kubernetes:6443'
    }
    user = {}
    context = {
      cluster: 'garden',
      user: 'robot'
    }
    kubeconfig = {
      clusters: [{
        name: 'garden',
        cluster
      }],
      users: [{
        name: 'robot',
        user
      }],
      contexts: [{
        name: 'default',
        context
      }],
      'current-context': 'default'
    }
    clientConfig = undefined
  })

  describe('kubeconfig with file references', () => {
    let tmpDir
    let tokenFile
    let caFile
    let keyFile
    let certFile
    let ac

    const writeValue = (filename, value) => fs.writeFileSync(filename, value, 'utf8')

    const updateValue = (filename, value) => {
      return new Promise(resolve => {
        const key = path.basename(filename, '.pem')
        clientConfig.watcher.once(`update:${key}`, resolve)
        writeValue(filename, value)
      })
    }

    beforeAll(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'g-kube-config-'))
      tokenFile = path.join(tmpDir, 'token')
      caFile = path.join(tmpDir, 'certificateAuthority.pem')
      keyFile = path.join(tmpDir, 'clientKey.pem')
      certFile = path.join(tmpDir, 'clientCert.pem')
    })

    afterAll(() => {
      if (tmpDir) {
        fs.rmSync(tmpDir, {
          recursive: true
        })
      }
    })

    beforeEach(() => {
      writeValue(tokenFile, 'token')
      writeValue(caFile, 'ca')
      writeValue(keyFile, 'key')
      writeValue(certFile, 'cert')
      cluster['certificate-authority'] = caFile
      ac = new AbortController()
    })

    afterEach(() => {
      ac.abort()
    })

    describe('with static token', () => {
      beforeEach(() => {
        user.token = 'token'
        return initClientConfig(ac.signal)
      })

      it('should update the cluster ca', async () => {
        expect(clientConfig.ca).toBe('ca')
        expect(clientConfig.auth.bearer).toBe('token')
        await updateValue(caFile, 'foo')
        expect(clientConfig.ca).toBe('foo')
      })
    })

    describe('with tokenFile', () => {
      beforeEach(() => {
        user.tokenFile = tokenFile
        return initClientConfig(ac.signal)
      })

      it('should update the user token', async () => {
        expect(clientConfig.ca).toBe('ca')
        expect(clientConfig.auth.bearer).toBe('token')
        await updateValue(tokenFile, 'bearer')
        expect(clientConfig.auth.bearer).toBe('bearer')
      })
    })

    describe('with client-key and client-certificate', () => {
      beforeEach(() => {
        Object.assign(user, {
          'client-key': keyFile,
          'client-certificate': certFile
        })
        return initClientConfig(ac.signal)
      })

      it('should update the user clientKey and clientCert', async () => {
        expect(clientConfig.ca).toBe('ca')
        expect(clientConfig.key).toBe('key')
        expect(clientConfig.cert).toBe('cert')
        await Promise.all([
          updateValue(keyFile, 'foo'),
          updateValue(certFile, 'bar')
        ])
        expect(clientConfig.key).toBe('foo')
        expect(clientConfig.cert).toBe('bar')
      })
    })
  })

  describe('kubeconfig without file references', () => {
    it('should create an extendable copy', async () => {
      user.token = 'token'
      initClientConfig()
      expect(clientConfig.auth.bearer).toBe('token')
      expect(Object.isFrozen(clientConfig)).toBe(true)
      const extendedClientConfig = clientConfig.extend()
      expect(Object.getPrototypeOf(extendedClientConfig)).toBe(clientConfig)
      expect(Object.isExtensible(extendedClientConfig)).toBe(true)
    })

    it('should override user token', async () => {
      user.token = 'token'
      initClientConfig()
      expect(clientConfig.auth.bearer).toBe('token')
      const extendedClientConfig = clientConfig.extend({
        auth: {
          bearer: 'foo'
        },
        responseType: 'json'
      })
      expect(extendedClientConfig.url).toBe('https://kubernetes:6443')
      expect(extendedClientConfig.auth.bearer).toBe('foo')
      expect(extendedClientConfig.key).toBeUndefined()
      expect(extendedClientConfig.cert).toBeUndefined()
      expect(extendedClientConfig.responseType).toBe('json')
    })

    it('should override user clientKey and clientCert', async () => {
      user['client-key-data'] = encodeBase64('key')
      user['client-certificate-data'] = encodeBase64('cert')
      initClientConfig()
      expect(clientConfig.key).toBe('key')
      expect(clientConfig.cert).toBe('cert')
      const extendedClientConfig = clientConfig.extend({
        key: 'foo',
        cert: 'bar',
        responseType: 'json'
      })
      expect(extendedClientConfig.url).toBe('https://kubernetes:6443')
      expect(extendedClientConfig.auth).toBeUndefined()
      expect(extendedClientConfig.key).toBe('foo')
      expect(extendedClientConfig.cert).toBe('bar')
      expect(extendedClientConfig.responseType).toBe('json')
    })

    describe('without a current user', () => {
      beforeEach(() => {
        context.user = 'baz'
        return initClientConfig()
      })

      it('should not have user credentials', async () => {
        expect(clientConfig.cert).toBeUndefined()
        expect(clientConfig.key).toBeUndefined()
        expect(clientConfig.auth).toBeUndefined()
      })
    })
  })
})
