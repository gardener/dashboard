//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

'use strict'

const fs = require('fs')
const path = require('path')
const os = require('os')
const yaml = require('js-yaml')
const { load, dumpKubeconfig, fromKubeconfig } = require('../lib/kubernetes-config')

describe('kubernetes-config', function () {
  const server = new URL('https://kubernetes:6443')
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwic3ViIjoic3lzdGVtOnNlcnZpY2VhY2NvdW50OmdhcmRlbjpkZWZhdWx0In0.-4rSuvvj5BStN6DwnmLAaRVbgpl5iCn2hG0pcqx0NPw'
  const ca = 'ca'
  const clientCertificate = 'client-certificate'
  const clientKey = 'client-key'
  const caData = Buffer.from(ca, 'utf8').toString('base64')
  const namespace = 'default'
  const cluster = 'cluster'
  const user = 'user'
  const currentContext = 'default'

  const sandbox = sinon.createSandbox()

  afterEach(function () {
    sandbox.restore()
  })

  it('should return the test config', function () {
    const config = load()
    expect(config).to.eql({
      url: server.origin,
      auth: {
        bearer: token
      }
    })
  })

  it('should return the in cluster config', function () {
    const readFileSyncStub = sandbox.stub(fs, 'readFileSync')
    readFileSyncStub
      .withArgs('/var/run/secrets/kubernetes.io/serviceaccount/token', sinon.match.string)
      .returns(token)
    readFileSyncStub
      .withArgs('/var/run/secrets/kubernetes.io/serviceaccount/ca.crt', sinon.match.string)
      .returns(ca)
    const config = load({
      NODE_ENV: 'development',
      KUBERNETES_SERVICE_HOST: server.hostname,
      KUBERNETES_SERVICE_PORT: server.port
    })
    expect(config).to.eql({
      url: server.origin,
      ca,
      rejectUnauthorized: true,
      auth: { bearer: token }
    })
  })

  it('should return the config from KUBECONFIG environment variable', function () {
    const kubeconfig = dumpKubeconfig({
      user,
      namespace,
      token,
      server: server.origin,
      caData
    })
    const readFileSyncStub = sandbox.stub(fs, 'readFileSync')
    readFileSyncStub
      .withArgs('/path/to/kube/config')
      .returns(kubeconfig)
    const config = load({
      NODE_ENV: 'development',
      KUBECONFIG: '/path/to/kube/config:/path/to/another/kube/config'
    })
    expect(config).to.eql({
      url: server.origin,
      ca,
      rejectUnauthorized: true,
      auth: { bearer: token }
    })
  })

  it('should return the config from the users homedir', function () {
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
    const readFileSyncStub = sandbox.stub(fs, 'readFileSync')
    readFileSyncStub
      .withArgs(defaultKubeconfigPath)
      .returns(kubeconfig)
    readFileSyncStub
      .withArgs('/path/to/ca.crt')
      .returns(ca)
    readFileSyncStub
      .withArgs('/path/to/client.crt')
      .returns(clientCertificate)
    readFileSyncStub
      .withArgs('/path/to/client.key')
      .returns(clientKey)
    const config = load({
      NODE_ENV: 'development'
    })
    expect(config).to.eql({
      url: server.origin,
      ca,
      rejectUnauthorized: true,
      cert: clientCertificate,
      key: clientKey
    })
  })

  it('should return the a clean config', function () {
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
    const readFileSyncStub = sandbox.stub(fs, 'readFileSync')
    readFileSyncStub
      .withArgs('/path/to/ca.crt')
      .returns(ca)
    const config = fromKubeconfig(kubeconfig)
    expect(config).to.eql({
      url: server.origin,
      rejectUnauthorized: true,
      auth: { bearer: token }
    })
  })
})
