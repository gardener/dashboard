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

const _ = require('lodash')
const pEvent = require('p-event')
const { AssertionError } = require('assert').strict
const common = require('./support/common')
const config = require('../lib/config')
const { getSeed } = require('../lib/cache')
const { Resources } = require('../lib/kubernetes-client')
const { Forbidden } = require('../lib/errors')

const {
  ensureTerminalAllowed
} = require('../lib/services/terminals')

const {
  getGardenTerminalHostClusterSecretRef,
  getGardenHostClusterKubeApiServer,
  getWildcardIngressDomainForSeed
} = require('../lib/services/terminals/utils')

const {
  toIngressResource,
  toServiceResource,
  toEndpointResource
} = require('../lib/services/terminals/terminalResources')

const {
  Handler,
  Bootstrapper
} = require('../lib/services/terminals/terminalBootstrap')

const {
  dashboardClient
} = require('../lib/kubernetes-client')

describe('services', function () {
  /* eslint no-unused-expressions: 0 */
  describe('terminals', function () {
    const seedName = 'infra1-seed'
    const soilName = 'soil-infra1'
    const kind = 'infra1'
    const region = 'foo-east'
    const ingressDomain = `ingress.${region}.${kind}.example.org`
    const firstSecretName = 'firstSecret'
    const secondSecretName = 'secondSecret'
    const client = {
      cluster: dashboardClient.cluster,
      core: {
        secrets: {
          list (namespace) {
            return {
              items: [
                { metadata: { namespace, name: firstSecretName } },
                { metadata: { namespace, name: secondSecretName } }
              ]
            }
          }
        }
      },
      getShoot ({ namespace, name }) {
        if (namespace === 'garden' && name === soilName) {
          return
        }
        if (namespace === 'garden' && name === seedName) {
          return {
            kind: 'Shoot',
            metadata: { namespace, name },
            spec: {
              seedName: soilName
            },
            status: {
              technicalID: `shoot--garden--${name}`
            }
          }
        }
        const project = namespace.replace(/^garden-/, '')
        return {
          kind: 'Shoot',
          metadata: { namespace, name },
          spec: {
            seedName: seedName
          },
          status: {
            technicalID: `shoot--${project}--${name}`
          }
        }
      }
    }

    const sandbox = sinon.createSandbox()

    function createConfigStub (terminal = {}) {
      const stub = sandbox.stub(config, 'terminal')
      const getTerminalConfig = () => {
        const apiServerIngress = {
          annotations: {
            foo: 'bar'
          }
        }
        return _.merge({
          containerImage: 'image:1.2.3',
          gardenTerminalHost: {
            apiServerIngressHost: 'gardenTerminalApiServerIngressHost'
          },
          garden: {
            operatorCredentials: {
              serviceAccountRef: {
                name: 'operatorServiceAccountName',
                namespace: 'garden'
              }
            }
          },
          bootstrap: {
            disabled: true,
            seedDisabled: true,
            shootDisabled: true,
            gardenTerminalHostDisabled: true,
            apiServerIngress,
            gardenTerminalHost: {
              apiServerIngress
            }
          }
        }, terminal)
      }
      stub.get(getTerminalConfig)
      return stub
    }

    beforeEach(function () {
      common.stub.getCloudProfiles(sandbox)
    })

    afterEach(function () {
      sandbox.restore()
    })

    describe('terminals', function () {
      describe('#getGardenTerminalHostClusterSecretRef', function () {
        it('should return the secret reference by secretRef', async function () {
          const gardenTerminalHost = {
            secretRef: {
              namespace: 'secretNamespace'
            }
          }
          createConfigStub({ gardenTerminalHost })
          const listSecretsSpy = sandbox.spy(client.core.secrets, 'list')
          const secretRef = await getGardenTerminalHostClusterSecretRef(client)
          expect(listSecretsSpy).to.be.calledOnce
          expect(listSecretsSpy.firstCall.args).to.eql([
            gardenTerminalHost.secretRef.namespace,
            {
              labelSelector: 'runtime=gardenTerminalHost'
            }
          ])
          expect(secretRef).to.eql({
            namespace: gardenTerminalHost.secretRef.namespace,
            name: firstSecretName
          })
        })

        it('should return the secret reference by seedRef', async function () {
          const gardenTerminalHost = {
            seedRef: seedName
          }
          createConfigStub({ gardenTerminalHost })
          const secretRef = await getGardenTerminalHostClusterSecretRef(client)
          expect(secretRef).to.eql({
            namespace: 'garden',
            name: `seedsecret-${gardenTerminalHost.seedRef}`
          })
        })

        it('should return the secret reference by shootRef', async function () {
          const gardenTerminalHost = {
            shootRef: {
              namespace: 'shootNamespace',
              name: 'shootName'
            }
          }
          createConfigStub({ gardenTerminalHost })
          const secretRef = await getGardenTerminalHostClusterSecretRef(client)
          expect(secretRef).to.eql({
            namespace: gardenTerminalHost.shootRef.namespace,
            name: `${gardenTerminalHost.shootRef.name}.kubeconfig`
          })
        })

        it('should throw an assertion error', async function () {
          const gardenTerminalHost = {
            noRef: 'none'
          }
          createConfigStub({ gardenTerminalHost })
          try {
            await getGardenTerminalHostClusterSecretRef(client)
            expect.fail('Assertion error expected')
          } catch (err) {
            expect(err).to.be.instanceof(AssertionError)
          }
        })

        it('should throw a no seed error ', async function () {
          const gardenTerminalHost = {
            seedRef: 'none'
          }
          createConfigStub({ gardenTerminalHost })
          try {
            await getGardenTerminalHostClusterSecretRef(client)
            expect.fail('Not found expected')
          } catch (err) {
            expect(err).to.be.instanceof(Error)
            expect(err.message).to.equal(`There is no seed with name ${gardenTerminalHost.seedRef}`)
          }
        })
      })
    })

    describe('#getGardenHostClusterKubeApiServer', function () {
      it('should return the kubeApiServer by secretRef', async function () {
        const gardenTerminalHost = {
          apiServerIngressHost: 'apiServerIngressHost',
          secretRef: {
            namespace: 'secretNamespace'
          }
        }
        createConfigStub({ gardenTerminalHost })
        const kubeApiServer = await getGardenHostClusterKubeApiServer(client)
        expect(kubeApiServer).to.equal(gardenTerminalHost.apiServerIngressHost)
      })

      it('should return the secret reference by shooted seedRef', async function () {
        const gardenTerminalHost = {
          seedRef: seedName
        }
        createConfigStub({ gardenTerminalHost })
        const kubeApiServer = await getGardenHostClusterKubeApiServer(client)
        const expectedKubeApiServer = common.getKubeApiServer('garden', gardenTerminalHost.seedRef, ingressDomain)
        expect(kubeApiServer).to.equal(expectedKubeApiServer)
      })

      it('should return the secret reference by non-shooted seedRef', async function () {
        const gardenTerminalHost = {
          seedRef: 'soil-infra1'
        }
        createConfigStub({ gardenTerminalHost })
        const kubeApiServer = await getGardenHostClusterKubeApiServer(client)
        const expectedKubeApiServer = `k-g.${ingressDomain}`
        expect(kubeApiServer).to.equal(expectedKubeApiServer)
      })

      it('should return the secret reference by shootRef', async function () {
        const gardenTerminalHost = {
          shootRef: {
            namespace: 'shootNamespace',
            name: 'shootName'
          }
        }
        createConfigStub({ gardenTerminalHost })
        const kubeApiServer = await getGardenHostClusterKubeApiServer(client)
        const expectedKubeApiServer = common.getKubeApiServer(gardenTerminalHost.shootRef.namespace, gardenTerminalHost.shootRef.name, ingressDomain)
        expect(kubeApiServer).to.equal(expectedKubeApiServer)
      })

      it('should throw an assertion error', async function () {
        const gardenTerminalHost = {
          noRef: 'none'
        }
        createConfigStub({ gardenTerminalHost })
        try {
          await getGardenHostClusterKubeApiServer(client)
          expect.fail('Assertion error expected')
        } catch (err) {
          expect(err).to.be.instanceof(AssertionError)
        }
      })
    })

    describe('#getWildcardIngressDomainForSeed', function () {
      it('should return the wildcard ingress domain for a seed', function () {
        const seed = { spec: { dns: { ingressDomain } } }
        const wildcardIngressDomain = getWildcardIngressDomainForSeed(seed)
        expect(wildcardIngressDomain).to.equal(`*.${ingressDomain}`)
      })
    })

    describe('#ensureTerminalAllowed', function () {
      it('should allow terminals for admins', function () {
        const isAdmin = true
        const method = 'foo'
        const target = 'foo'
        try {
          ensureTerminalAllowed({ method, isAdmin, target})
        } catch (err) {
          expect.fail('No exception expected')
        }
      })

      it('should allow terminals for project admins', function () {
        const isAdmin = false
        const method = 'create'
        const target = 'shoot'
        try {
          ensureTerminalAllowed({ method, isAdmin, target})
        } catch (err) {
          expect.fail('No exception expected')
        }
      })

      it('should allow to list terminals for project admins', function () {
        const isAdmin = false
        const method = 'list'
        const target = 'foo'
        try {
          ensureTerminalAllowed({ method, isAdmin, target})
        } catch (err) {
          expect.fail('No exception expected')
        }
      })

      it('should disallow cp terminals for project admins', function () {
        const isAdmin = false
        const method = 'create'
        const target = 'cp'
        try {
          ensureTerminalAllowed({ method, isAdmin, target})
          expect.fail('Forbidden error expected')
        } catch (err) {
          expect(err).to.be.instanceof(Forbidden)
        }
      })

      it('should disallow garden terminals for project admins', function () {
        const isAdmin = false
        const method = 'create'
        const target = 'garden'
        try {
          ensureTerminalAllowed({ method, isAdmin, target})
          expect.fail('Forbidden error expected')
        } catch (err) {
          expect(err).to.be.instanceof(Forbidden)
        }
      })
    })

    describe('resources', function () {
      const name = 'name'
      const namespace = 'namespace'
      const spec = {
        baz: 'foo'
      }
      const subsets = {
        baz: 'bar'
      }
      const annotations = {
        foo: 'bar'
      }
      const ownerReferences = [{ name: 'ownerReferenceNAme' }]
      const labels = {}
      const COMPONENT_TERMINAL = 'dashboard-terminal'

      it('should return an ingress resource', function () {
        const resource = toIngressResource({
          name,
          spec,
          annotations,
          ownerReferences,
          labels
        })
        const { apiVersion, kind } = Resources.Ingress
        expect(resource).to.eql({
          apiVersion,
          kind,
          metadata: {
            name,
            labels: Object.assign({ component: COMPONENT_TERMINAL }, labels),
            annotations,
            ownerReferences
          },
          spec
        })
      })

      it('should return a service resource', function () {
        const resource = toServiceResource({
          name,
          namespace,
          spec,
          annotations,
          ownerReferences,
          labels
        })
        const { apiVersion, kind } = Resources.Service
        expect(resource).to.eql({
          apiVersion,
          kind,
          metadata: {
            name,
            namespace,
            labels: Object.assign({ component: COMPONENT_TERMINAL }, labels),
            annotations,
            ownerReferences
          },
          spec
        })
      })

      it('should return an endpoints resource', function () {
        const resource = toEndpointResource({
          name,
          namespace,
          subsets,
          annotations,
          ownerReferences,
          labels
        })
        const { apiVersion, kind } = Resources.Endpoints
        expect(resource).to.eql({
          apiVersion,
          kind,
          metadata: {
            name,
            namespace,
            labels: Object.assign({ component: COMPONENT_TERMINAL }, labels),
            annotations,
            ownerReferences
          },
          subsets
        })
      })
    })

    describe('bootstrap', function () {
      const hostClient = {
        cluster: {
          server: new URL('https://gardenApiServerHostname:6443')
        },
        core: {
          services: {
            mergePatch (namespace, name, body) {
              expect(namespace).to.equal('garden')
              expect(name).to.equal('garden-host-cluster-apiserver')
              return body
            }
          }
        },
        extensions: {
          ingresses: {
            mergePatch (namespace, name, body) {
              expect(namespace).to.equal('garden')
              expect(name).to.equal('garden-host-cluster-apiserver')
              return body
            }
          }
        }
      }

      const soilClient = {
        cluster: {
          server: new URL('https://soilApiServerHostname:6443')
        },
        core: {
          services: {
            mergePatch (namespace, name, body) {
              expect(namespace).to.equal(`shoot--garden--${seedName}`)
              expect(name).to.equal('dashboard-terminal-kube-apiserver')
              return body
            }
          }
        },
        extensions: {
          ingresses: {
            mergePatch (namespace, name, body) {
              expect(namespace).to.equal(`shoot--garden--${seedName}`)
              expect(name).to.equal('dashboard-terminal-kube-apiserver')
              return body
            }
          }
        }
      }

      const seedClient = {
        cluster: {
          server: new URL('https://seedApiServerHostname:6443')
        },
        core: {
          services: {
            mergePatch (namespace, name, body) {
              expect(namespace).to.equal('shoot--foo--baz')
              expect(name).to.equal('dashboard-terminal-kube-apiserver')
              return body
            }
          }
        },
        extensions: {
          ingresses: {
            mergePatch (namespace, name, body) {
              expect(namespace).to.equal('shoot--foo--baz')
              expect(name).to.equal('dashboard-terminal-kube-apiserver')
              return body
            }
          }
        }
      }

      const shootList = [{
        kind: 'Shoot',
        metadata: {
          namespace: 'garden-foo',
          name: 'bar'
        },
        spec: {
          seedName
        },
        status: {
          technicalID: 'shoot--foo--bar',
          lastOperation: {
            progress: 5
          }
        }
      }, {
        kind: 'Shoot',
        metadata: {
          namespace: 'garden-foo',
          name: 'baz'
        },
        spec: {
          seedName
        },
        status: {
          technicalID: 'shoot--foo--baz',
          lastOperation: {
            progress: 50
          }
        }
      }]

      beforeEach(function () {
        sandbox.stub(dashboardClient, 'core').get(() => {
          return client.core
        })
        sandbox.stub(dashboardClient, 'core.gardener.cloud').get(() => {
          return {
            seeds: {
              get (name) {
                return getSeed(name)
              }
            },
            shoots: {
              get (namespace, name) {
                return _.find(shootList, ({ metadata }) => metadata.name === name && metadata.namespace === namespace)
              }
            }
          }
        })
        sandbox.stub(dashboardClient, 'getShoot').callsFake(({ namespace, name }) => {
          return client.getShoot({ namespace, name })
        })
        sandbox.stub(dashboardClient, 'createKubeconfigClient').callsFake(({ namespace, name }) => {
          if (name === firstSecretName) {
            return hostClient
          }
          if (name === `seedsecret-${soilName}`) {
            return soilClient
          }
          if (name === `seedsecret-${seedName}`) {
            return seedClient
          }
        })
      })

      it('should not bootstrap anything', async function () {
        const bootstrap = {
          disabled: true
        }
        const seed = getSeed(seedName)
        createConfigStub({ bootstrap })
        const bootstrapper = new Bootstrapper()
        bootstrapper.push(new Handler(() => {}, 'test'))
        bootstrapper.bootstrapResource(seed)
        bootstrapper.bootstrapResource(shootList[0])
        await pEvent(bootstrapper, 'empty')
        const stats = bootstrapper.getStats()
        expect(stats.total).to.equal(1)
        expect(stats.successRate).to.equal(1)
      })

      it('should bootstrap the garden terminal host cluster', async function () {
        const gardenTerminalHost = {
          secretRef: {
            namespace: 'garden'
          }
        }
        const bootstrap = {
          disabled: false,
          gardenTerminalHostDisabled: false
        }
        createConfigStub({ gardenTerminalHost, bootstrap })
        const bootstrapper = new Bootstrapper()
        await pEvent(bootstrapper, 'empty')
        const stats = bootstrapper.getStats()
        expect(stats.total).to.equal(1)
        expect(stats.successRate).to.equal(1)
      })

      it('should bootstrap a seed cluster', async function () {
        const gardenTerminalHost = {
          seedRef: seedName
        }
        const bootstrap = {
          disabled: false,
          seedDisabled: false
        }
        const seed = getSeed(seedName)
        createConfigStub({ gardenTerminalHost, bootstrap })
        const bootstrapper = new Bootstrapper()
        bootstrapper.bootstrapResource(seed)
        await pEvent(bootstrapper, 'empty')
        const stats = bootstrapper.getStats()
        expect(stats.total).to.equal(1)
        expect(stats.successRate).to.equal(1)
      })

      it('should bootstrap a shoot cluster', async function () {
        const gardenTerminalHost = {
          seedRef: seedName
        }
        const bootstrap = {
          disabled: false,
          shootDisabled: false
        }
        createConfigStub({ gardenTerminalHost, bootstrap })
        const bootstrapper = new Bootstrapper()
        for (const shoot of shootList) {
          bootstrapper.bootstrapResource(shoot)
        }
        await pEvent(bootstrapper, 'empty')
        const stats = bootstrapper.getStats()
        expect(bootstrapper.isResourcePending(shootList[0])).to.be.true
        expect(stats.total).to.equal(1)
        expect(stats.successRate).to.equal(1)
      })
    })
  })
})
