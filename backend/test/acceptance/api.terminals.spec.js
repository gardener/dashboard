//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { WatchBuilder } = require('@gardener-dashboard/kube-client')
const { Terminal } = require('@gardener-dashboard/kube-client/lib/resources/GardenerDashboard')
const { ServiceAccount } = require('@gardener-dashboard/kube-client/lib/resources/Core')
const { converter } = require('../../lib/services/terminals')
const common = require('../support/common')
const pEvent = require('p-event')

module.exports = function info ({ agent, sandbox, k8s, auth }) {
  /* eslint no-unused-expressions: 0 */
  const username = 'admin@example.org'
  const id = username
  const aud = ['gardener']
  const project = 'foo'
  const namespace = `garden-${project}`

  const seedName = 'infra1-seed'
  const kind = 'infra1'
  const region = 'foo-east'
  const ingressDomain = `ingress.${region}.${kind}.example.org`

  function createWatchBuilderStub ({
    namespace,
    name,
    username,
    host,
    serviceAccountName,
    serviceAccountSecretName,
    podName
  }) {
    const watchStub = sandbox.stub(WatchBuilder, 'create')

    const terminal = {
      metadata: {
        namespace,
        name,
        annotations: {
          'gardener.cloud/created-by': username
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
    watchStub
      .withArgs(
        sinon.match.instanceOf(Terminal),
        `namespaces/${namespace}/terminals`,
        sinon.match.instanceOf(URLSearchParams),
        name
      )
      .callsFake(() => terminalReconnector.start())

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
    watchStub
      .withArgs(
        sinon.match.instanceOf(ServiceAccount),
        `namespaces/${host.namespace}/serviceaccounts`,
        sinon.match.instanceOf(URLSearchParams),
        serviceAccountName
      )
      .callsFake(() => serviceAccountReconnector.start())

    return watchStub
  }

  let makeSanitizedHtmlStub

  beforeEach(function () {
    makeSanitizedHtmlStub = sandbox.stub(converter, 'makeSanitizedHtml').callsFake(text => text)
  })

  it('should list the project terminal shortcuts', async function () {
    const user = auth.createUser({ id, aud })
    const bearer = await user.bearer

    const shortcut1 = {
      title: 'Title',
      description: 'Description',
      target: 'cp',
      container: {
        image: 'foo:bar',
        command: [
          'cmd'
        ],
        args: [
          'a',
          'b'
        ]
      }
    }
    const shortcuts = [
      shortcut1,
      {
        invalidShortcut: 'foo'
      }
    ]

    common.stub.getCloudProfiles(sandbox)
    k8s.stub.listProjectTerminalShortcuts({ bearer, namespace, shortcuts })

    const res = await agent
      .post('/api/terminals')
      .set('cookie', await user.cookie)
      .send({
        method: 'listProjectTerminalShortcuts',
        params: {
          coordinate: {
            namespace
          }
        }
      })

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).to.eql([
      shortcut1
    ])
  })

  it('should return empty shortcut list for invalid shortcuts', async function () {
    const user = auth.createUser({ id, aud })
    const bearer = await user.bearer

    const shortcuts = [{
      invalidShortcut: 'foo'
    }]

    common.stub.getCloudProfiles(sandbox)
    k8s.stub.listProjectTerminalShortcuts({ bearer, namespace, shortcuts })

    const res = await agent
      .post('/api/terminals')
      .set('cookie', await user.cookie)
      .send({
        method: 'listProjectTerminalShortcuts',
        params: {
          coordinate: {
            namespace
          }
        }
      })

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).to.eql([])
  })

  it('should return empty shortcut list for non existing secret', async function () {
    const user = auth.createUser({ id, aud })
    const bearer = await user.bearer

    common.stub.getCloudProfiles(sandbox)
    k8s.stub.listProjectTerminalShortcuts({ bearer, namespace })

    const res = await agent
      .post('/api/terminals')
      .set('cookie', await user.cookie)
      .send({
        method: 'listProjectTerminalShortcuts',
        params: {
          coordinate: {
            namespace
          }
        }
      })

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).to.eql([])
  })

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
        .post('/api/terminals')
        .set('cookie', await user.cookie)
        .send({
          method: 'create',
          params: {
            coordinate: {
              namespace,
              target
            }
          }
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
        },
        imageHelpText: 'Dummy Image Description'
      })
      expect(makeSanitizedHtmlStub).to.have.callCount(1)
      expect(makeSanitizedHtmlStub.getCall(0)).to.be.calledWithExactly('Dummy Image Description')
    })

    it('should reuse a terminal session', async function () {
      const user = auth.createUser({ id, aud })
      const bearer = await user.bearer

      const image = 'fooImage:0.1.2'

      common.stub.getCloudProfiles(sandbox)
      const scope = k8s.stub.reuseTerminal({ bearer, username, namespace, name, target, seedName, hostNamespace, image })

      const res = await agent
        .post('/api/terminals')
        .set('cookie', await user.cookie)
        .send({
          method: 'create',
          params: {
            coordinate: {
              namespace,
              target
            }
          }
        })

      const [, interceptor] = await pEvent(scope, 'replied', {
        multiArgs: true,
        filter ([, interceptor]) {
          return interceptor.method === 'PATCH' && interceptor.statusCode === 200
        }
      })
      const { metadata: { annotations } } = interceptor.replyFunction()
      expect(annotations['dashboard.gardener.cloud/operation']).to.eql('keepalive')

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
        },
        imageHelpText: 'Foo Image Description'
      })
      expect(makeSanitizedHtmlStub).to.have.callCount(1)
      expect(makeSanitizedHtmlStub.getCall(0)).to.be.calledWithExactly('Foo Image Description')
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

      // stub WatchBuilder
      const watchBuilderStub = createWatchBuilderStub({
        namespace,
        name,
        username,
        host,
        serviceAccountName,
        serviceAccountSecretName,
        podName
      })

      const res = await agent
        .post('/api/terminals')
        .set('cookie', await user.cookie)
        .send({
          method: 'fetch',
          params: {
            name,
            namespace
          }
        })
      expect(res).to.have.status(200)
      expect(res).to.be.json
      expect(watchBuilderStub).to.have.been.calledTwice
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
      expect(makeSanitizedHtmlStub).to.have.callCount(0)
    })

    it('should read the terminal config', async function () {
      const user = auth.createUser({ id, aud })
      const bearer = await user.bearer

      k8s.stub.getTerminalConfig({ bearer, namespace, target })

      const res = await agent
        .post('/api/terminals')
        .set('cookie', await user.cookie)
        .send({
          method: 'config',
          params: {
            coordinate: {
              namespace,
              target
            }
          }
        })

      expect(res).to.have.status(200)
      expect(res).to.be.json
      expect(res.body).to.eql({
        container: {
          image: 'dummyImage:1.0.0'
        }
      })
      expect(makeSanitizedHtmlStub).to.have.callCount(0)
    })

    it('should keep a terminal resource alive', async function () {
      const user = auth.createUser({ id, aud })
      const bearer = await user.bearer

      k8s.stub.keepAliveTerminal({ bearer, username, namespace, name, target })

      const res = await agent
        .post('/api/terminals')
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
      expect(makeSanitizedHtmlStub).to.have.callCount(0)
    })

    it('should delete a terminal resource', async function () {
      const user = auth.createUser({ id, aud })
      const bearer = await user.bearer

      k8s.stub.deleteTerminal({ bearer, username, namespace, name, target })

      const res = await agent
        .post('/api/terminals')
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
        namespace
      })
      expect(makeSanitizedHtmlStub).to.have.callCount(0)
    })
  })

  describe('cp', function () {
    const target = 'cp'
    const name = 'term-cp-0815'

    const shootName = 'fooShoot'
    const seedShootNamespace = `shoot--${project}--${shootName}`
    const kubeApiServer = common.getKubeApiServer('garden', seedName, ingressDomain)

    it('should create a terminal resource', async function () {
      const user = auth.createUser({ id, aud })
      const bearer = await user.bearer

      common.stub.getCloudProfiles(sandbox)
      k8s.stub.createTerminal({ bearer, username, namespace, target, shootName, seedName })

      const res = await agent
        .post('/api/terminals')
        .set('cookie', await user.cookie)
        .send({
          method: 'create',
          params: {
            coordinate: {
              name: shootName,
              namespace,
              target
            }
          }
        })

      expect(res).to.have.status(200)
      expect(res).to.be.json
      expect(res.body).to.eql({
        metadata: {
          namespace,
          name
        },
        hostCluster: {
          kubeApiServer,
          namespace: seedShootNamespace
        },
        imageHelpText: 'Dummy Image Description'
      })
      expect(makeSanitizedHtmlStub).to.have.callCount(1)
      expect(makeSanitizedHtmlStub.getCall(0)).to.be.calledWithExactly('Dummy Image Description')
    })

    it('should read the terminal config', async function () {
      const user = auth.createUser({ id, aud })
      const bearer = await user.bearer

      k8s.stub.getTerminalConfig({ bearer, namespace, target })

      const res = await agent
        .post('/api/terminals')
        .set('cookie', await user.cookie)
        .send({
          method: 'config',
          params: {
            coordinate: {
              name: shootName,
              namespace,
              target
            }
          }
        })

      expect(res).to.have.status(200)
      expect(res).to.be.json
      expect(res.body).to.eql({
        container: {
          image: 'dummyImage:1.0.0'
        }
      })
      expect(makeSanitizedHtmlStub).to.have.callCount(0)
    })

    it('should keep a terminal resource alive', async function () {
      const user = auth.createUser({ id, aud })
      const bearer = await user.bearer

      k8s.stub.keepAliveTerminal({ bearer, username, namespace, name, target })

      const res = await agent
        .post('/api/terminals')
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
      expect(makeSanitizedHtmlStub).to.have.callCount(0)
    })
  })

  describe('shoot', function () {
    const target = 'shoot'
    const name = 'term-shoot-0815'
    const hostNamespace = 'term-host-0815'

    const shootName = 'fooShoot'
    const kubeApiServer = common.getKubeApiServer(namespace, shootName, ingressDomain)

    it('should create a terminal resource', async function () {
      const user = auth.createUser({ id, aud })
      const bearer = await user.bearer

      common.stub.getCloudProfiles(sandbox)
      k8s.stub.createTerminal({ bearer, username, namespace, target, shootName, seedName })

      const res = await agent
        .post('/api/terminals')
        .set('cookie', await user.cookie)
        .send({
          method: 'create',
          params: {
            coordinate: {
              name: shootName,
              namespace,
              target
            },
            preferredHost: 'shoot'
          }
        })

      expect(res).to.have.status(200)
      expect(res).to.be.json
      expect(res.body).to.eql({
        metadata: {
          namespace,
          name
        },
        hostCluster: {
          kubeApiServer,
          namespace: hostNamespace
        },
        imageHelpText: 'Dummy Image Description'
      })
      expect(makeSanitizedHtmlStub).to.have.callCount(1)
      expect(makeSanitizedHtmlStub.getCall(0)).to.be.calledWithExactly('Dummy Image Description')
    })

    it('should reuse a terminal session', async function () {
      const user = auth.createUser({ id, aud })
      const bearer = await user.bearer

      const image = 'fooImage:0.1.2'
      const preferredHost = 'shoot'

      const shootName = 'fooShoot'
      const kubeApiServer = common.getKubeApiServer(namespace, shootName, ingressDomain)

      common.stub.getCloudProfiles(sandbox)
      const scope = k8s.stub.reuseTerminal({ bearer, username, namespace, name, shootName, target, hostNamespace, image, preferredHost })

      const res = await agent
        .post('/api/terminals')
        .set('cookie', await user.cookie)
        .send({
          method: 'create',
          params: {
            coordinate: {
              name: shootName,
              namespace,
              target
            }
          }
        })

      const [, interceptor] = await pEvent(scope, 'replied', {
        multiArgs: true,
        filter ([, interceptor]) {
          return interceptor.method === 'PATCH' && interceptor.statusCode === 200
        }
      })
      const { metadata: { annotations } } = interceptor.replyFunction()
      expect(annotations['dashboard.gardener.cloud/operation']).to.eql('keepalive')

      expect(res).to.have.status(200)
      expect(res).to.be.json
      expect(res.body).to.eql({
        metadata: {
          namespace,
          name
        },
        hostCluster: {
          kubeApiServer,
          namespace: hostNamespace
        },
        imageHelpText: 'Foo Image Description'
      })
      expect(makeSanitizedHtmlStub).to.have.callCount(1)
      expect(makeSanitizedHtmlStub.getCall(0)).to.be.calledWithExactly('Foo Image Description')
    })

    it('should read the terminal config', async function () {
      const user = auth.createUser({ id, aud })
      const bearer = await user.bearer

      k8s.stub.getTerminalConfig({ bearer, namespace, shootName, target })

      const res = await agent
        .post('/api/terminals')
        .set('cookie', await user.cookie)
        .send({
          method: 'config',
          params: {
            coordinate: {
              name: shootName,
              namespace,
              target
            }
          }
        })

      expect(res).to.have.status(200)
      expect(res).to.be.json
      expect(res.body).to.eql({
        container: {
          image: 'dummyImage:1.0.0'
        },
        nodes: [{
          data: {
            kubernetesHostname: 'hostname',
            readyStatus: 'True'
          },
          metadata: {
            creationTimestamp: '2020-01-01T20:01:01Z',
            name: 'nodename'
          }
        }]
      })
      expect(makeSanitizedHtmlStub).to.have.callCount(0)
    })

    it('should list terminal resources', async function () {
      const user = auth.createUser({ id, aud })
      const bearer = await user.bearer

      k8s.stub.listTerminalResources({ bearer, username, namespace, shootName })

      const res = await agent
        .post('/api/terminals')
        .set('cookie', await user.cookie)
        .send({
          method: 'list',
          params: {
            coordinate: {
              target,
              namespace
            }
          }
        })

      expect(res).to.have.status(200)
      expect(res).to.be.json
      expect(res.body).to.eql([{
        metadata: {
          name: 'foo1',
          namespace: 'foo',
          identifier: '1'
        }
      }, {
        metadata: {
          name: 'foo2',
          namespace: 'foo',
          identifier: '2'
        }
      }])
      expect(makeSanitizedHtmlStub).to.have.callCount(0)
    })
  })
}
