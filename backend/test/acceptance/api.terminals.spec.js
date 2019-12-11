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

const { WatchBuilder } = require('../../lib/kubernetes-client')
const common = require('../support/common')

module.exports = function info ({ agent, sandbox, k8s, auth }) {
  /* eslint no-unused-expressions: 0 */
  const username = 'admin@example.org'
  const id = username
  const aud = [ 'gardener' ]
  const project = 'foo'
  const namespace = `garden-${project}`
  const seedName = 'infra1-seed'
  const kind = 'infra1'
  const region = 'foo-east'
  const ingressDomain = `ingress.${region}.${kind}.example.org`

  describe('garden', function () {
    const target = 'garden'
    const name = 'term-garden-0815'
    const hostNamespace = 'term-host-0815'

    it('should create a terminal resource', async function () {
      const user = auth.createUser({ id, aud })
      const bearer = await user.bearer

      common.stub.getCloudProfiles(sandbox)
      k8s.stub.createTerminal({ bearer, username, namespace, target, seedName })

      const res = await agent
        .post(`/api/namespaces/${namespace}/terminals/${target}`)
        .set('cookie', await user.cookie)
        .send({
          method: 'create',
          params: {}
        })

      expect(res).to.have.status(200)
      expect(res).to.be.json
      expect(res.body).to.eql({
        metadata: {
          namespace,
          name
        },
        hostCluster: {
          kubeApiServer: `k-g.${ingressDomain}`,
          namespace: hostNamespace
        }
      })
    })

    it('should fetch a terminal resource', async function () {
      const user = auth.createUser({ id, aud })
      const bearer = await user.bearer
      const host = {
        namespace: hostNamespace,
        credentials: {
          secretRef: {
            name: 'host.kubeconfig',
            namespace: 'garden'
          }
        }
      }
      const serviceAccountName = 'term-access-0815'
      const serviceAccountSecretName = 'term-access-secret-0815'
      const token = 'dG9rZW4K'
      const podName = 'term-0815'
      const hostUrl = 'https://garden.host.cluster.foo.bar'

      common.stub.getCloudProfiles(sandbox)
      k8s.stub.fetchTerminal({ bearer, target, hostUrl, host, serviceAccountSecretName, token })

      // create watch stub
      const watchStub = sandbox.stub(WatchBuilder, 'create')

      const terminal = {
        metadata: {
          namespace,
          name,
          annotations: {
            'garden.sapcloud.io/createdBy': username
          }
        },
        spec: {
          host
        },
        status: {}
      }
      const status = {
        attachServiceAccountName: serviceAccountName,
        podName
      }
      const terminalReconnector = common.createReconnectorStub([
        ['ADDED', { ...terminal }],
        ['MODIFIED', { ...terminal, status }]
      ])
      watchStub.onFirstCall().callsFake(() => terminalReconnector.start())

      const serviceAccount = {
        metadata: {
          name: serviceAccountName,
          namespace: host.namespace
        },
        secrets: []
      }
      const secrets = [{
        name: serviceAccountSecretName
      }]
      const serviceAccountReconnector = common.createReconnectorStub([
        ['ADDED', { ...serviceAccount }],
        ['MODIFIED', { ...serviceAccount, secrets }]
      ])
      watchStub.onSecondCall().callsFake(() => serviceAccountReconnector.start())

      const res = await agent
        .post(`/api/namespaces/${namespace}/terminals/${target}`)
        .set('cookie', await user.cookie)
        .send({
          method: 'fetch',
          params: {
            namespace,
            name
          }
        })

      expect(res).to.have.status(200)
      expect(res).to.be.json
      expect(watchStub).to.have.been.calledTwice
      expect(res.body).to.eql({
        metadata: {
          namespace,
          name
        },
        hostCluster: {
          token,
          pod: {
            container: 'terminal',
            name: podName
          }
        }
      })
    })

    it('should read the terminal config', async function () {
      const user = auth.createUser({ id, aud })
      const bearer = await user.bearer

      k8s.stub.getTerminalConfig({ bearer, namespace, target })

      const res = await agent
        .get(`/api/namespaces/${namespace}/terminals/${target}/config`)
        .set('cookie', await user.cookie)

      expect(res).to.have.status(200)
      expect(res).to.be.json
      expect(res.body).to.eql({ image: 'dummyImage:1.0.0' })
    })

    it('should keep a terminal resource alive', async function () {
      const user = auth.createUser({ id, aud })
      const bearer = await user.bearer

      k8s.stub.keepAliveTerminal({ bearer, username, namespace, name, target })

      const res = await agent
        .post(`/api/namespaces/${namespace}/terminals/${target}`)
        .set('cookie', await user.cookie)
        .send({
          method: 'heartbeat',
          params: {
            name,
            namespace
          }
        })

      expect(res).to.have.status(200)
      expect(res).to.be.json
      expect(res.body).to.eql({ ok: true })
    })

    it('should delete a terminal resource', async function () {
      const user = auth.createUser({ id, aud })
      const bearer = await user.bearer

      k8s.stub.deleteTerminal({ bearer, username, namespace, name, target })

      const res = await agent
        .post(`/api/namespaces/${namespace}/terminals/${target}`)
        .set('cookie', await user.cookie)
        .send({
          method: 'remove',
          params: {
            name,
            namespace
          }
        })

      expect(res).to.have.status(200)
      expect(res).to.be.json
      expect(res.body).to.eql({
        name,
        namespace })
    })
  })
}
