//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const pEvent = require('p-event')
const { AssertionError } = require('assert').strict
const common = require('./support/common')
const config = require('../lib/config')
const { getSeed } = require('../lib/cache')
const { Resources } = require('@gardener-dashboard/kube-client')
const { Forbidden } = require('http-errors')
const logger = require('../lib/logger')
const yaml = require('js-yaml')
const { encodeBase64 } = require('../lib/utils')

const {
  ensureTerminalAllowed,
  findImageDescription,
  fromShortcutSecretResource
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
} = require('@gardener-dashboard/kube-client')

const nextTick = () => new Promise(process.nextTick)

describe('services', function () {
  /* eslint no-unused-expressions: 0 */
  describe('terminals', function () {
    const seedName = 'infra1-seed'
    const seedWithoutSecretRefName = 'infra4-seed-without-secretRef'
    const unreachableSeedName = 'infra3-seed' // unreachable seed
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
          async list (namespace) {
            await nextTick()
            return {
              items: [
                { metadata: { namespace, name: firstSecretName } },
                { metadata: { namespace, name: secondSecretName } }
              ]
            }
          }
        }
      },
      async getShoot ({ namespace, name }) {
        await nextTick()
        if (namespace === 'garden' && name === soilName) {
          return
        }
        if (namespace === 'garden' && _.includes([seedName, seedWithoutSecretRefName], name)) {
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
      describe('#findImageDescription', function () {
        it('should match regexp', async function () {
          const containerImage = 'foo:bar'
          const containerImageDescriptions = [{
            image: '/foo:.*/',
            description: 'baz'
          }]
          expect(findImageDescription(containerImage, containerImageDescriptions)).to.be.eq('baz')
        })

        it('should not match regexp', async function () {
          const containerImage = 'foo:bar'

          let containerImageDescriptions = [{
            image: '/dummy:.*/',
            description: 'baz'
          }]
          expect(findImageDescription(containerImage, containerImageDescriptions)).to.be.undefined

          containerImageDescriptions = [{
            image: 'foo:.*', // will not be recognized as regexp as it has to start and end with /
            description: 'baz'
          }]
          expect(findImageDescription(containerImage, containerImageDescriptions)).to.be.undefined
        })

        it('should match exactly', async function () {
          const containerImage = 'foo:bar'

          const containerImageDescriptions = [{
            image: 'foo:bar',
            description: 'baz'
          }]
          expect(findImageDescription(containerImage, containerImageDescriptions)).to.be.eq('baz')
        })

        it('should not match', async function () {
          const containerImage = 'foo:bar'

          const containerImageDescriptions = [{
            image: 'bar:foo',
            description: 'baz'
          }]
          expect(findImageDescription(containerImage, containerImageDescriptions)).to.be.undefined

          expect(findImageDescription('foo:bar', undefined)).to.be.undefined
          expect(findImageDescription('foo:bar', [])).to.be.undefined
          expect(findImageDescription('foo:bar', [{}])).to.be.undefined
        })
      })
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
          ensureTerminalAllowed({ method, isAdmin, body: { coordinate: { target } } })
        } catch (err) {
          expect.fail('No exception expected')
        }
      })

      it('should allow terminals for project admins', function () {
        const isAdmin = false
        const method = 'create'
        const target = 'shoot'
        try {
          ensureTerminalAllowed({ method, isAdmin, body: { coordinate: { target } } })
        } catch (err) {
          expect.fail('No exception expected')
        }
      })

      it('should allow to list terminals for project admins', function () {
        const isAdmin = false
        const method = 'list'
        const target = 'foo'
        try {
          ensureTerminalAllowed({ method, isAdmin, body: { coordinate: { target } } })
        } catch (err) {
          expect.fail('No exception expected')
        }
      })

      it('should disallow cp terminals for project admins', function () {
        const isAdmin = false
        const method = 'create'
        const target = 'cp'
        try {
          ensureTerminalAllowed({ method, isAdmin, body: { coordinate: { target } } })
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
            async mergePatch (namespace, name, body) {
              await nextTick()
              expect(namespace).to.equal('garden')
              expect(name).to.equal('garden-host-cluster-apiserver')
              return body
            }
          }
        },
        extensions: {
          ingresses: {
            async mergePatch (namespace, name, body) {
              await nextTick()
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
            async mergePatch (namespace, name, body) {
              await nextTick()
              expect(namespace).to.equal(`shoot--garden--${seedName}`)
              expect(name).to.equal('dashboard-terminal-kube-apiserver')
              return body
            }
          }
        },
        extensions: {
          ingresses: {
            async mergePatch (namespace, name, body) {
              await nextTick()
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
            async mergePatch (namespace, name, body) {
              await nextTick()
              expect(namespace).to.equal('shoot--foo--baz')
              expect(name).to.equal('dashboard-terminal-kube-apiserver')
              return body
            }
          }
        },
        extensions: {
          ingresses: {
            async mergePatch (namespace, name, body) {
              await nextTick()
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
          name: 'bar',
          uid: '1'
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
          name: 'baz',
          uid: '2'
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
      }, {
        kind: 'Shoot',
        metadata: {
          namespace: 'garden-foo',
          name: 'dummy',
          uid: '3'
        },
        spec: {
          seedName: seedWithoutSecretRefName // seed without spec.secretRef
        },
        status: {
          technicalID: 'shoot--foo--dummy',
          lastOperation: {
            progress: 50
          }
        }
      }, {
        kind: 'Shoot',
        metadata: {
          namespace: 'garden-foo',
          name: 'unreachable',
          uid: '4'
        },
        spec: {
          seedName: unreachableSeedName // unreachable seed
        },
        status: {
          technicalID: 'shoot--foo--unreachable',
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
              async get (name) {
                await nextTick()
                return getSeed(name)
              }
            },
            shoots: {
              async get (namespace, name) {
                await nextTick()
                if (name === seedName) {
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
                return _
                  .chain(shootList)
                  .find({ metadata: { namespace, name } })
                  .cloneDeep()
                  .value()
              }
            }
          }
        })
        sandbox.stub(dashboardClient, 'createKubeconfigClient').callsFake(async ({ name }) => {
          await nextTick()
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
        bootstrapper.push(new Handler(() => {}, { description: 'test' }))
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

      it('should skip bootstrap of unreachable seed cluster', async function () {
        const seedName = unreachableSeedName
        const gardenTerminalHost = {
          seedRef: seedName
        }
        const bootstrap = {
          disabled: false,
          seedDisabled: false
        }
        const debugSpy = sandbox.spy(logger, 'debug')

        const seed = getSeed(seedName)
        createConfigStub({ gardenTerminalHost, bootstrap })
        const bootstrapper = new Bootstrapper()
        bootstrapper.bootstrapResource(seed)
        await pEvent(bootstrapper, 'empty')
        const stats = bootstrapper.getStats()
        expect(stats.total).to.equal(1)
        expect(stats.successRate).to.equal(1)
        expect(debugSpy).to.be.calledWith(`Seed ${seedName} is not reachable from the dashboard, bootstrapping aborted`)
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
        expect(stats.total).to.equal(3)
        expect(stats.successRate).to.equal(1)
        expect(bootstrapper.bootstrapped.size).to.equal(3)
        expect(bootstrapper.isResourceBootstrapped(shootList[1])).to.be.true
        expect(bootstrapper.isResourceBootstrapped(shootList[2])).to.be.true
      })

      it('should not bootstrap shoot cluster', async function () {
        const bootstrap = {
          disabled: false,
          shootDisabled: false
        }
        createConfigStub({ bootstrap })

        const infoSpy = sandbox.spy(logger, 'info')

        const bootstrapper = new Bootstrapper()
        // bootstrap dummy whose seed does not have .spec.secretRef set
        bootstrapper.bootstrapResource(shootList[2])
        await pEvent(bootstrapper, 'empty')
        const stats = bootstrapper.getStats()
        expect(bootstrapper.isResourcePending(shootList[0])).to.be.false
        expect(stats.total).to.equal(1)
        expect(stats.successRate).to.equal(1)
        expect(infoSpy).to.be.calledOnce
      })

      it('should not bootstrap unreachable shoot cluster', async function () {
        const bootstrap = {
          disabled: false,
          shootDisabled: false
        }
        createConfigStub({ bootstrap })

        const debugSpy = sandbox.spy(logger, 'debug')

        const bootstrapper = new Bootstrapper()
        // bootstrap unreachable whose seed is flagged as unreachable
        const shoot = shootList[3]
        const { namespace, name } = shoot.metadata
        bootstrapper.bootstrapResource(shoot)
        await pEvent(bootstrapper, 'empty')
        const stats = bootstrapper.getStats()
        expect(bootstrapper.isResourcePending(shootList[0])).to.be.false
        expect(stats.total).to.equal(1)
        expect(stats.successRate).to.equal(1)
        expect(debugSpy).to.be.calledWith(`Seed ${unreachableSeedName} is not reachable from the dashboard for shoot ${namespace}/${name}, bootstrapping aborted`)
      })
    })

    it('should pick only valid fields from shortcut resource', function () {
      let actualShortcuts = fromShortcutSecretResource({
        data: encodeBase64(yaml.safeDump({}))
      })
      expect(actualShortcuts).to.eql([])

      actualShortcuts = fromShortcutSecretResource({
        data: {
          shortcuts: undefined
        }
      })
      expect(actualShortcuts).to.eql([])

      actualShortcuts = fromShortcutSecretResource({
        data: {
          shortcuts: encodeBase64('invalid')
        }
      })
      expect(actualShortcuts).to.eql([])

      actualShortcuts = fromShortcutSecretResource({
        data: {
          shortcuts: encodeBase64(yaml.safeDump([
            {
              foo: 'bar'
            }
          ]))
        }
      })
      expect(actualShortcuts).to.eql([])

      actualShortcuts = fromShortcutSecretResource({
        data: {
          shortcuts: encodeBase64(yaml.safeDump([
            {}, // invalid object
            {
              description: 'invalid due to missing required keys'
            },
            {
              title: 'invalid target',
              target: 'foo'
            },
            {
              title: 'minimalistic shortcut',
              target: 'shoot'
            },
            {
              title: 'title',
              description: 'description',
              target: 'shoot',
              container: {
                image: 'image',
                command: ['command'],
                args: ['args']
              },
              shootSelector: {
                matchLabels: {
                  foo: 'bar'
                }
              },
              foo: 'ignore'
            }
          ]))
        }
      })
      expect(actualShortcuts).to.eql([
        {
          title: 'minimalistic shortcut',
          target: 'shoot'
        },
        {
          title: 'title',
          description: 'description',
          target: 'shoot',
          container: {
            image: 'image',
            command: ['command'],
            args: ['args']
          },
          shootSelector: {
            matchLabels: {
              foo: 'bar'
            }
          }
        }
      ])
    })
  })
})
