//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')

const Config = require('../../lib/Config')
const ClientConfig = require('../../lib/ClientConfig')

describe('client-config', () => {
  let tmpDir
  let tokenFile
  let caFile
  let keyFile
  let certFile
  let user
  let cluster
  let kubeconfig
  let clientConfig

  const setToken = value => fs.writeFileSync(tokenFile, value, 'utf8')
  const setCa = value => fs.writeFileSync(caFile, value, 'utf8')
  const setKey = value => fs.writeFileSync(keyFile, value, 'utf8')
  const setCert = value => fs.writeFileSync(certFile, value, 'utf8')

  const changeEvent = file => new Promise(resolve => clientConfig.watcher.on('change', path => {
    if (file === path) {
      resolve()
    }
  }))

  const initClientConfig = () => {
    const config = new Config(kubeconfig)
    clientConfig = new ClientConfig(config, { reactive: true })
    return new Promise(resolve => clientConfig.watcher.once('ready', resolve))
  }

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'g-kube-config'))
    tokenFile = path.join(tmpDir, 'token')
    caFile = path.join(tmpDir, 'ca.crt')
    keyFile = path.join(tmpDir, 'key.pem')
    certFile = path.join(tmpDir, 'cert.pem')
  })

  afterAll(() => {
    if (tmpDir) {
      fs.rmSync(tmpDir, {
        recursive: true
      })
    }
  })

  beforeEach(() => {
    setToken('token')
    setCa('ca')
    setKey('key')
    setCert('cert')

    user = {}
    cluster = {
      server: 'https://kubernetes:6443',
      'certificate-authority': caFile
    }
    kubeconfig = {
      clusters: [{
        name: 'garden',
        cluster
      }],
      contexts: [{
        name: 'default',
        context: {
          cluster: 'garden',
          user: 'robot'
        }
      }],
      'current-context': 'default',
      users: [{
        name: 'robot',
        user
      }]
    }

    clientConfig = undefined
  })

  afterEach(() => {
    if (clientConfig) {
      return clientConfig.watcher.destroy()
    }
  })

  describe('with static token', () => {
    beforeEach(() => {
      Object.assign(user, {
        token: 'token'
      })
      return initClientConfig()
    })

    it('should update the cluster ca', async () => {
      expect(clientConfig.ca).toBe('ca')
      expect(clientConfig.auth.bearer).toBe('token')
      setCa('foo')
      await changeEvent(caFile)
      expect(clientConfig.ca).toBe('foo')
    })
  })

  describe('with tokenFile', () => {
    beforeEach(() => {
      Object.assign(user, {
        tokenFile
      })
      return initClientConfig()
    })

    it('should update the user token', async () => {
      expect(clientConfig.ca).toBe('ca')
      expect(clientConfig.auth.bearer).toBe('token')
      setToken('bearer')
      await changeEvent(tokenFile)
      expect(clientConfig.auth.bearer).toBe('bearer')
    })
  })

  describe('with client-key and client-certificate', () => {
    beforeEach(() => {
      Object.assign(user, {
        'client-key': keyFile,
        'client-certificate': certFile
      })
      return initClientConfig()
    })

    it('should update the user clientKey and clientCert', async () => {
      expect(clientConfig.ca).toBe('ca')
      expect(clientConfig.key).toBe('key')
      expect(clientConfig.cert).toBe('cert')
      setKey('foo')
      setCert('bar')
      await Promise.all([changeEvent(keyFile), changeEvent(certFile)])
      expect(clientConfig.key).toBe('foo')
      expect(clientConfig.cert).toBe('bar')
    })
  })
})
