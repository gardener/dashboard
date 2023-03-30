//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const yaml = require('js-yaml')
const assert = require('assert').strict
const { Forbidden } = require('http-errors')
const config = require('../lib/config')
const { cache } = require('../lib/cache')
const { encodeBase64 } = require('../lib/utils')

const {
  ensureTerminalAllowed,
  findImageDescription,
  fromShortcutSecretResource
} = require('../lib/services/terminals')

const {
  getGardenTerminalHostClusterSecretRef,
  getGardenHostClusterKubeApiServer
} = require('../lib/services/terminals/utils')

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
      async getManagedSeed ({ namespace, name }) {
        await nextTick()
        if (namespace === 'garden' && name === soilName) {
          return
        }
        return {
          metadata: { namespace, name },
          spec: { shoot: { name } }
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
            seedName
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

        it('should throw a no seed error', async function () {
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
          expect(() => ensureTerminalAllowed({ method, isAdmin, body: { coordinate: { target } } })).not.toThrow()
        })

        it('should allow terminals for project admins', function () {
          const isAdmin = false
          const method = 'create'
          const target = 'shoot'
          expect(() => ensureTerminalAllowed({ method, isAdmin, body: { coordinate: { target } } })).not.toThrow()
        })

        it('should allow to list terminals for project admins', function () {
          const isAdmin = false
          const method = 'list'
          const target = 'foo'
          expect(() => ensureTerminalAllowed({ method, isAdmin, body: { coordinate: { target } } })).not.toThrow()
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
          data: encodeBase64(yaml.dump({}))
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
            shortcuts: encodeBase64(yaml.dump([
              {
                foo: 'bar'
              }
            ]))
          }
        })
        expect(actualShortcuts).toEqual([])

        actualShortcuts = fromShortcutSecretResource({
          data: {
            shortcuts: encodeBase64(yaml.dump([
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
    })
  })
})
