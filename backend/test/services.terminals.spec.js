//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const yaml = require('js-yaml')
const pEvent = require('p-event')
const assert = require('assert').strict
const { Forbidden } = require('http-errors')
const { Resources } = require('@gardener-dashboard/kube-client')
const logger = require('../lib/logger')
const config = require('../lib/config')
const { getSeed, cache } = require('../lib/cache')
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
  Bootstrapper,
  BootstrapStatusEnum
} = require('../lib/services/terminals/terminalBootstrap')

const {
  dashboardClient
} = require('@gardener-dashboard/kube-client')

const { AssertionError } = assert

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

    function createTerminalConfig (terminal = {}) {
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

    const terminalConfig = config.terminal
    let terminalStub
    let seedList

    beforeEach(function () {
      terminalStub = jest.fn().mockReturnValue(terminalConfig)
      Object.defineProperty(config, 'terminal', { get: terminalStub })
      seedList = fixtures.seeds.list()
      jest.spyOn(cache, 'getSeeds').mockReturnValue(seedList)
    })

    afterEach(function () {
      Object.defineProperty(config, 'terminal', { value: terminalConfig })
    })

    describe('index', function () {
      describe('#findImageDescription', function () {
        it('should match regexp', async function () {
          const containerImage = 'foo:bar'
          const containerImageDescriptions = [{
            image: '/foo:.*/',
            description: 'baz'
          }]
          expect(findImageDescription(containerImage, containerImageDescriptions)).toBe('baz')
        })

        it('should not match regexp', async function () {
          const containerImage = 'foo:bar'

          let containerImageDescriptions = [{
            image: '/dummy:.*/',
            description: 'baz'
          }]
          expect(findImageDescription(containerImage, containerImageDescriptions)).toBeUndefined()

          containerImageDescriptions = [{
            image: 'foo:.*', // will not be recognized as regexp as it has to start and end with /
            description: 'baz'
          }]
          expect(findImageDescription(containerImage, containerImageDescriptions)).toBeUndefined()
        })

        it('should match exactly', async function () {
          const containerImage = 'foo:bar'

          const containerImageDescriptions = [{
            image: 'foo:bar',
            description: 'baz'
          }]
          expect(findImageDescription(containerImage, containerImageDescriptions)).toBe('baz')
        })

        it('should not match', async function () {
          const containerImage = 'foo:bar'

          const containerImageDescriptions = [{
            image: 'bar:foo',
            description: 'baz'
          }]
          expect(findImageDescription(containerImage, containerImageDescriptions)).toBeUndefined()

          expect(findImageDescription('foo:bar', undefined)).toBeUndefined()
          expect(findImageDescription('foo:bar', [])).toBeUndefined()
          expect(findImageDescription('foo:bar', [{}])).toBeUndefined()
        })
      })

      describe('#getGardenTerminalHostClusterSecretRef', function () {
        it('should return the secret reference by secretRef', async function () {
          const gardenTerminalHost = {
            secretRef: {
              namespace: 'secretNamespace'
            }
          }
          terminalStub.mockReturnValue(createTerminalConfig({ gardenTerminalHost }))
          const listSecretsSpy = jest.spyOn(client.core.secrets, 'list')
          const secretRef = await getGardenTerminalHostClusterSecretRef(client)
          expect(listSecretsSpy).toBeCalledTimes(1)
          expect(listSecretsSpy.mock.calls[0]).toEqual([
            gardenTerminalHost.secretRef.namespace,
            {
              labelSelector: 'runtime=gardenTerminalHost'
            }
          ])
          expect(secretRef).toEqual({
            namespace: gardenTerminalHost.secretRef.namespace,
            name: firstSecretName
          })
        })

        it('should return the secret reference by seedRef', async function () {
          const gardenTerminalHost = {
            seedRef: seedName
          }
          terminalStub.mockReturnValue(createTerminalConfig({ gardenTerminalHost }))
          const secretRef = await getGardenTerminalHostClusterSecretRef(client)
          expect(secretRef).toEqual({
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
          terminalStub.mockReturnValue(createTerminalConfig({ gardenTerminalHost }))
          const secretRef = await getGardenTerminalHostClusterSecretRef(client)
          expect(secretRef).toEqual({
            namespace: gardenTerminalHost.shootRef.namespace,
            name: `${gardenTerminalHost.shootRef.name}.kubeconfig`
          })
        })

        it('should throw an assertion error', async function () {
          const gardenTerminalHost = {
            noRef: 'none'
          }
          terminalStub.mockReturnValue(createTerminalConfig({ gardenTerminalHost }))
          await expect(getGardenTerminalHostClusterSecretRef(client)).rejects.toThrow(AssertionError)
        })

        it('should throw a no seed error ', async function () {
          const gardenTerminalHost = {
            seedRef: 'none'
          }
          terminalStub.mockReturnValue(createTerminalConfig({ gardenTerminalHost }))
          await expect(getGardenTerminalHostClusterSecretRef(client)).rejects.toThrow(`There is no seed with name ${gardenTerminalHost.seedRef}`)
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
          expect(() => ensureTerminalAllowed({ method, isAdmin, body: { coordinate: { target } } })).toThrow(Forbidden)
        })
      })

      it('should pick only valid fields from shortcut resource', function () {
        let actualShortcuts = fromShortcutSecretResource({
          data: encodeBase64(yaml.safeDump({}))
        })
        expect(actualShortcuts).toEqual([])

        actualShortcuts = fromShortcutSecretResource({
          data: {
            shortcuts: undefined
          }
        })
        expect(actualShortcuts).toEqual([])

        actualShortcuts = fromShortcutSecretResource({
          data: {
            shortcuts: encodeBase64('invalid')
          }
        })
        expect(actualShortcuts).toEqual([])

        actualShortcuts = fromShortcutSecretResource({
          data: {
            shortcuts: encodeBase64(yaml.safeDump([
              {
                foo: 'bar'
              }
            ]))
          }
        })
        expect(actualShortcuts).toEqual([])

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
        expect(actualShortcuts).toEqual([
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

    describe('utils', function () {
      describe('#getGardenHostClusterKubeApiServer', function () {
        it('should return the kubeApiServer by secretRef', async function () {
          const gardenTerminalHost = {
            apiServerIngressHost: 'apiServerIngressHost',
            secretRef: {
              namespace: 'secretNamespace'
            }
          }
          terminalStub.mockReturnValue(createTerminalConfig({ gardenTerminalHost }))
          const kubeApiServer = await getGardenHostClusterKubeApiServer(client)
          expect(kubeApiServer).toBe(gardenTerminalHost.apiServerIngressHost)
        })

        it('should return the secret reference by shooted seedRef', async function () {
          const gardenTerminalHost = {
            seedRef: seedName
          }
          terminalStub.mockReturnValue(createTerminalConfig({ gardenTerminalHost }))
          const kubeApiServer = await getGardenHostClusterKubeApiServer(client)
          const expectedKubeApiServer = fixtures.kube.getApiServer('garden', gardenTerminalHost.seedRef, ingressDomain)
          expect(kubeApiServer).toBe(expectedKubeApiServer)
        })

        it('should return the secret reference by non-shooted seedRef', async function () {
          const gardenTerminalHost = {
            seedRef: 'soil-infra1'
          }
          terminalStub.mockReturnValue(createTerminalConfig({ gardenTerminalHost }))
          const kubeApiServer = await getGardenHostClusterKubeApiServer(client)
          const expectedKubeApiServer = `k-g.${ingressDomain}`
          expect(kubeApiServer).toBe(expectedKubeApiServer)
        })

        it('should return the secret reference by shootRef', async function () {
          const gardenTerminalHost = {
            shootRef: {
              namespace: 'shootNamespace',
              name: 'shootName'
            }
          }
          terminalStub.mockReturnValue(createTerminalConfig({ gardenTerminalHost }))
          const kubeApiServer = await getGardenHostClusterKubeApiServer(client)
          const expectedKubeApiServer = fixtures.kube.getApiServer(gardenTerminalHost.shootRef.namespace, gardenTerminalHost.shootRef.name, ingressDomain)
          expect(kubeApiServer).toBe(expectedKubeApiServer)
        })

        it('should throw an assertion error', async function () {
          const gardenTerminalHost = {
            noRef: 'none'
          }
          terminalStub.mockReturnValue(createTerminalConfig({ gardenTerminalHost }))
          await expect(getGardenHostClusterKubeApiServer(client)).rejects.toThrow(AssertionError)
        })
      })

      describe('#getWildcardIngressDomainForSeed', function () {
        it('should return the wildcard ingress domain for a seed', function () {
          const seed = { spec: { dns: { ingressDomain } } }
          const wildcardIngressDomain = getWildcardIngressDomainForSeed(seed)
          expect(wildcardIngressDomain).toBe(`*.${ingressDomain}`)
        })
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
        expect(resource).toEqual({
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
        expect(resource).toEqual({
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
        expect(resource).toEqual({
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
              assert.strictEqual(namespace, 'garden')
              assert.strictEqual(name, 'garden-host-cluster-apiserver')
              return body
            }
          }
        },
        extensions: {
          ingresses: {
            async mergePatch (namespace, name, body) {
              await nextTick()
              assert.strictEqual(namespace, 'garden')
              assert.strictEqual(name, 'garden-host-cluster-apiserver')
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
              assert.strictEqual(namespace, `shoot--garden--${seedName}`)
              assert.strictEqual(name, 'dashboard-terminal-kube-apiserver')
              return body
            }
          }
        },
        extensions: {
          ingresses: {
            async mergePatch (namespace, name, body) {
              await nextTick()
              assert.strictEqual(namespace, `shoot--garden--${seedName}`)
              assert.strictEqual(name, 'dashboard-terminal-kube-apiserver')
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
              assert.strictEqual(namespace, 'shoot--foo--baz')
              assert.strictEqual(name, 'dashboard-terminal-kube-apiserver')
              return body
            }
          }
        },
        extensions: {
          ingresses: {
            async mergePatch (namespace, name, body) {
              await nextTick()
              assert.strictEqual(namespace, 'shoot--foo--baz')
              assert.strictEqual(name, 'dashboard-terminal-kube-apiserver')
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
          seedName: seedWithoutSecretRefName
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
          seedName: unreachableSeedName
        },
        status: {
          technicalID: 'shoot--foo--unreachable',
          lastOperation: {
            progress: 50
          }
        }
      }]

      let coreStub
      let coreGardenerCloudStub
      const core = dashboardClient.core
      const coreGardenerCloud = dashboardClient['core.gardener.cloud']

      beforeEach(function () {
        coreStub = jest.fn().mockReturnValue(client.core)
        coreGardenerCloudStub = jest.fn().mockReturnValue({
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
            },
            async listAllNamespaces (query) {
              await nextTick()

              const fieldSelector = fixtures.helper.parseFieldSelector(query.fieldSelector)
              const items = _
                .chain(shootList)
                .filter(fieldSelector)
                .tap(shoot => (delete shoot.kind))
                .value()
              return {
                kind: 'ShootList',
                items
              }
            }
          }
        })
        Object.defineProperty(dashboardClient, 'core', { get: coreStub })
        Object.defineProperty(dashboardClient, 'core.gardener.cloud', { get: coreGardenerCloudStub })

        jest.spyOn(dashboardClient, 'createKubeconfigClient').mockImplementation(async ({ name }) => {
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
        jest.clearAllMocks()
      })

      afterEach(function () {
        Object.defineProperty(dashboardClient, 'core', { value: core })
        Object.defineProperty(dashboardClient, 'core.gardener.cloud', { value: coreGardenerCloud })
      })

      function getStates (bootstrapper, resources) {
        return _.map(resources, resource => bootstrapper.bootstrapState.getValue(resource).state)
      }

      it('should not bootstrap anything', async function () {
        const bootstrap = {
          disabled: true
        }
        const seed = getSeed(seedName)
        terminalStub.mockReturnValue(createTerminalConfig({ bootstrap }))
        const bootstrapper = new Bootstrapper()
        bootstrapper.push(new Handler(() => {}, { description: 'test' }))
        bootstrapper.bootstrapResource(seed)
        bootstrapper.bootstrapResource(shootList[0])
        await pEvent(bootstrapper, 'drain')
        const stats = bootstrapper.getStats()
        expect(stats.total).toBe(1)
        expect(stats.successRate).toBe(1)
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
        terminalStub.mockReturnValue(createTerminalConfig({ gardenTerminalHost, bootstrap }))
        const bootstrapper = new Bootstrapper()
        await pEvent(bootstrapper, 'drain')
        const stats = bootstrapper.getStats()
        expect(stats.total).toBe(1)
        expect(stats.successRate).toBe(1)
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
        terminalStub.mockReturnValue(createTerminalConfig({ gardenTerminalHost, bootstrap }))
        const bootstrapper = new Bootstrapper()
        bootstrapper.bootstrapResource(seed)
        await pEvent(bootstrapper, 'drain')
        const stats = bootstrapper.getStats()
        expect(stats.total).toBe(1)
        expect(stats.successRate).toBe(1)
        expect(getStates(bootstrapper, [seed])).toEqual([BootstrapStatusEnum.BOOTSTRAPPED])
      })

      it('should bootstrap a seed cluster after revision changed', async function () {
        const gardenTerminalHost = {
          seedRef: seedName
        }
        const bootstrap = {
          disabled: false,
          shootDisabled: false,
          seedDisabled: false
        }
        terminalStub.mockReturnValue(createTerminalConfig({ gardenTerminalHost, bootstrap }))
        const seed = _.find(seedList, ['metadata.name', seedName])
        _.set(seed, 'metadata.annotations["seed.gardener.cloud/ingress-class"]', 'foo')
        const bootstrapper = new Bootstrapper()
        bootstrapper.bootstrapResource(seed)
        await pEvent(bootstrapper, 'drain')
        const revision = bootstrapper.bootstrapState.getValue(seed).revision
        let shootStates = getStates(bootstrapper, shootList)
        expect(shootStates).toEqual([
          BootstrapStatusEnum.INITIAL,
          BootstrapStatusEnum.INITIAL,
          BootstrapStatusEnum.INITIAL,
          BootstrapStatusEnum.INITIAL
        ])
        _.set(seed, 'metadata.annotations["seed.gardener.cloud/ingress-class"]', 'bar') // the bootstrap revision will change
        bootstrapper.bootstrapResource(seed)
        await pEvent(bootstrapper, 'drain')
        const seedValue = bootstrapper.bootstrapState.getValue(seed)
        expect(seedValue.state).toBe(BootstrapStatusEnum.BOOTSTRAPPED)
        expect(seedValue.revision).not.toBe(revision)
        shootStates = getStates(bootstrapper, shootList)
        expect(shootStates).toEqual([
          BootstrapStatusEnum.POSTPONED,
          BootstrapStatusEnum.BOOTSTRAPPED,
          BootstrapStatusEnum.INITIAL,
          BootstrapStatusEnum.INITIAL
        ])
        expect(logger.debug).toBeCalledWith('Bootstrap required for 2 shoots due to terminal bootstrap revision change')
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

        const seed = getSeed(seedName)
        terminalStub.mockReturnValue(createTerminalConfig({ gardenTerminalHost, bootstrap }))
        const bootstrapper = new Bootstrapper()
        bootstrapper.bootstrapResource(seed)
        await pEvent(bootstrapper, 'drain')
        const stats = bootstrapper.getStats()
        expect(stats.total).toBe(1)
        expect(stats.successRate).toBe(1)
        expect(logger.debug).toBeCalledWith(`Seed ${seedName} is not reachable from the dashboard, bootstrapping aborted`)
      })

      it('should bootstrap a shoot cluster', async function () {
        const gardenTerminalHost = {
          seedRef: seedName
        }
        const bootstrap = {
          disabled: false,
          shootDisabled: false
        }
        terminalStub.mockReturnValue(createTerminalConfig({ gardenTerminalHost, bootstrap }))
        const bootstrapper = new Bootstrapper()
        for (const shoot of shootList) {
          bootstrapper.bootstrapResource(shoot)
        }
        await pEvent(bootstrapper, 'drain')
        const stats = bootstrapper.getStats()
        expect(stats.total).toBe(3)
        expect(stats.successRate).toBe(1)
        expect(bootstrapper.bootstrapState.size).toBe(4)
        const shootStates = getStates(bootstrapper, shootList)
        expect(shootStates).toEqual([
          BootstrapStatusEnum.POSTPONED,
          BootstrapStatusEnum.BOOTSTRAPPED,
          BootstrapStatusEnum.BOOTSTRAPPED,
          BootstrapStatusEnum.BOOTSTRAPPED
        ])
      })

      it('should not bootstrap shoot cluster', async function () {
        const bootstrap = {
          disabled: false,
          shootDisabled: false
        }
        terminalStub.mockReturnValue(createTerminalConfig({ bootstrap }))

        const bootstrapper = new Bootstrapper()
        // bootstrap dummy whose seed does not have .spec.secretRef set
        const shoot = shootList[2]
        const { namespace, name } = shoot.metadata
        bootstrapper.bootstrapResource(shoot)
        await pEvent(bootstrapper, 'drain')
        const stats = bootstrapper.getStats()
        expect(getStates(bootstrapper, [shoot])).toEqual([BootstrapStatusEnum.BOOTSTRAPPED])
        expect(stats.total).toBe(1)
        expect(stats.successRate).toBe(1)
        expect(logger.info).toBeCalledWith(`Bootstrapping Shoot ${namespace}/${name} aborted as 'spec.secretRef' on the seed is missing. In case a shoot is used as seed, add the flag \`with-secret-ref\` to the \`shoot.gardener.cloud/use-as-seed\` annotation`)
      })

      it('should not bootstrap unreachable shoot cluster', async function () {
        const bootstrap = {
          disabled: false,
          shootDisabled: false
        }
        terminalStub.mockReturnValue(createTerminalConfig({ bootstrap }))

        const bootstrapper = new Bootstrapper()
        // bootstrap unreachable whose seed is flagged as unreachable
        const shoot = shootList[3]
        const { namespace, name } = shoot.metadata
        bootstrapper.bootstrapResource(shoot)
        await pEvent(bootstrapper, 'drain')
        const stats = bootstrapper.getStats()
        expect(getStates(bootstrapper, [shoot])).toEqual([BootstrapStatusEnum.BOOTSTRAPPED])
        expect(stats.total).toBe(1)
        expect(stats.successRate).toBe(1)
        expect(logger.debug).toBeCalledWith(`Seed ${unreachableSeedName} is not reachable from the dashboard for shoot ${namespace}/${name}, bootstrapping aborted`)
      })
    })
  })
})
