//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { promisify } = require('util')
const createError = require('http-errors')
const _ = require('lodash')

const logger = require('../lib/logger')
const mockConfigTerminal = require('../lib/config').mockTerminal
const {
  Handler,
  Bootstrapper,
  BootstrapStatusEnum,
  BootstrapReasonEnum
} = require('../lib/terminal/bootstrap')
const { bootstrapRevision } = require('../lib/terminal/utils')
const { soilName } = require('../__fixtures__/constants')

const { seedName, unreachableSeedName } = fixtures.constants
const { createTerminalConfig, getDescription, isDrained } = fixtures.helper
const shootList = fixtures.shoots.list().filter(item => item.metadata.namespace !== 'garden')
const { gardenClient, mockHostClusterServer, mocks } = fixtures.clients

class TestBootstrapper extends Bootstrapper {
  bootstrapItems (items = []) {
    for (const item of items) {
      this[item instanceof Handler ? 'push' : 'bootstrapResource'](item)
    }
    return isDrained(this)
  }

  static async create ({ gardenTerminalHost = {}, bootstrap = {} }, items = []) {
    const terminalConfig = createTerminalConfig({ gardenTerminalHost, bootstrap })
    mockConfigTerminal.mockReturnValue(terminalConfig)

    const bootstrapper = new TestBootstrapper(gardenClient)
    await bootstrapper.bootstrapItems(items)
    return bootstrapper
  }
}

function expectMocksToMatchSnapshots (mocks) {
  const calls = {}
  for (const [key, { mock }] of Object.entries(mocks)) {
    if (mock.calls.length) {
      calls[key] = mock.calls
    }
  }
  expect(calls).toMatchSnapshot('mocks')
}

function expectBootstrapperToMatchSnapshots (bootstrapper, ...items) {
  const { successRate, total } = bootstrapper.getStats()
  const data = { successRate, total }
  if (items.length) {
    const statusKeys = _.invert(BootstrapStatusEnum)
    const iteratee = item => {
      const state = bootstrapper.bootstrapState.getValue(item).state
      const qualifiedName = item.metadata.namespace
        ? [item.metadata.namespace, item.metadata.name].join('/')
        : item.metadata.name
      return [
        item.kind,
        qualifiedName,
        statusKeys[state]
      ]
    }
    data.states = items.map(iteratee)
  }
  expect(data).toMatchSnapshot('bootstrapper')
}

describe('terminal', () => {
  let seedList
  let seed

  beforeEach(() => {
    seedList = fixtures.seeds.list()
    seed = _.find(seedList, ['metadata.name', seedName])
    gardenClient['core.gardener.cloud'].seeds.set(seedList)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('bootstrap', () => {
    describe('disabled', () => {
      const terminalConfig = {
        bootstrap: {
          disabled: true
        }
      }

      it('should not bootstrap anything', async () => {
        const items = [
          seed,
          shootList[0]
        ]
        const bootstrapper = await TestBootstrapper.create(terminalConfig, items)

        expect.hasAssertions()
        expectMocksToMatchSnapshots(mocks)
        expectBootstrapperToMatchSnapshots(bootstrapper)
      })
    })

    describe('gardenTerminalHost enabled', () => {
      let terminalConfig

      beforeEach(() => {
        terminalConfig = {
          gardenTerminalHost: {
            secretRef: { namespace: 'garden' }
          },
          bootstrap: {
            disabled: false,
            gardenTerminalHostDisabled: false
          }
        }
      })

      it('should not bootstrap an unsupported kind', async () => {
        const kind = 'Foo'
        const items = [{ kind, metadata: { name: 'foo', uid: '13' } }]
        const bootstrapper = await TestBootstrapper.create(terminalConfig, items)

        expect.hasAssertions()
        expectMocksToMatchSnapshots(mocks)
        expectBootstrapperToMatchSnapshots(bootstrapper)

        expect(logger.error).toBeCalledWith(`can't bootstrap unsupported kind ${kind}`)
      })

      it('should bootstrap the host cluster with domain name', async () => {
        mockHostClusterServer.mockReturnValue(new URL('https://host-apiserver:6443'))
        const bootstrapper = await TestBootstrapper.create(terminalConfig)

        expect.hasAssertions()
        expectMocksToMatchSnapshots(mocks)
        expectBootstrapperToMatchSnapshots(bootstrapper)
      })

      it('should bootstrap a host cluster with IP address', async () => {
        mockHostClusterServer.mockReturnValue(new URL('https://192.168.178.2:6443'))
        const bootstrapper = await TestBootstrapper.create(terminalConfig)

        expect.hasAssertions()
        expectMocksToMatchSnapshots(mocks)
        expectBootstrapperToMatchSnapshots(bootstrapper)
      })

      it('should fail to bootstrap the host cluster', async () => {
        const { mockHostServicesMergePatch, mockHostIngressesMergePatch } = mocks
        mockHostServicesMergePatch.mockRejectedValueOnce(createError(404, 'Service not found'))
        mockHostIngressesMergePatch.mockRejectedValueOnce(createError(422, 'Failed to patch ingress'))
        mockHostClusterServer.mockReturnValue(new URL('https://host-apiserver:6443'))
        const bootstrapper = await TestBootstrapper.create(terminalConfig)

        expect.hasAssertions()
        expectMocksToMatchSnapshots(mocks)
        expectBootstrapperToMatchSnapshots(bootstrapper)
      })
    })

    describe('seed enabled', () => {
      let terminalConfig

      beforeEach(() => {
        terminalConfig = {
          gardenTerminalHost: {
            seedRef: seedName
          },
          bootstrap: {
            disabled: false,
            seedDisabled: false
          }
        }
      })

      it('should bootstrap a seed cluster', async () => {
        const items = [seed]
        const bootstrapper = await TestBootstrapper.create(terminalConfig, items)

        expect.hasAssertions()
        expectMocksToMatchSnapshots(mocks)
        expectBootstrapperToMatchSnapshots(bootstrapper, ...items)
      })

      it('should bootstrap an unmanged seed cluster', async () => {
        terminalConfig.gardenTerminalHost.secretRef = soilName
        seed = _.find(seedList, ['metadata.name', soilName])
        const items = [seed]
        const bootstrapper = await TestBootstrapper.create(terminalConfig, items)

        expect.hasAssertions()
        expectMocksToMatchSnapshots(mocks)
        expectBootstrapperToMatchSnapshots(bootstrapper, ...items)
      })

      it('should bootstrap a seed cluster after revision changed', async () => {
        terminalConfig.bootstrap.shootDisabled = false
        seed.metadata.annotations = { 'seed.gardener.cloud/ingress-class': 'foo' }
        const items = [seed]
        const bootstrapper = await TestBootstrapper.create(terminalConfig, items)
        const getRevision = item => bootstrapper.bootstrapState.getValue(item).revision
        const revision = getRevision(seed)

        expect.hasAssertions()
        expectMocksToMatchSnapshots(mocks)
        expectBootstrapperToMatchSnapshots(bootstrapper, ...items, ...shootList)

        jest.clearAllMocks()

        seed.metadata.annotations['seed.gardener.cloud/ingress-class'] = 'bar' // the bootstrap revision will change
        await bootstrapper.bootstrapItems(items)

        expectMocksToMatchSnapshots(mocks)
        expectBootstrapperToMatchSnapshots(bootstrapper, ...items, ...shootList)

        expect(getRevision(seed)).not.toBe(revision)
        expect(logger.debug).toBeCalledWith('Bootstrap required for 2 shoots due to terminal bootstrap revision change')
      })

      it('should skip bootstrap of unreachable seed cluster', async () => {
        terminalConfig.gardenTerminalHost.secretRef = unreachableSeedName
        seed = _.find(seedList, ['metadata.name', unreachableSeedName])
        const items = [seed]
        const bootstrapper = await TestBootstrapper.create(terminalConfig, items)

        expect.hasAssertions()
        expectMocksToMatchSnapshots(mocks)
        expectBootstrapperToMatchSnapshots(bootstrapper, ...items)

        expect(logger.debug).toBeCalledWith(`Seed ${seed.metadata.name} is not reachable from the dashboard, bootstrapping aborted`)
      })

      it('should skip bootstrap if required config is missing', async () => {
        terminalConfig.bootstrap.apiServerIngress = { annotations: null }
        const items = [seed]
        const bootstrapper = await TestBootstrapper.create(terminalConfig, items)

        expect.hasAssertions()
        expectMocksToMatchSnapshots(mocks)
        expectBootstrapperToMatchSnapshots(bootstrapper, ...items)

        expect(bootstrapper.requiredConfigExists).toBe(false)
        expect(logger.error).toBeCalledWith("required terminal config 'terminal.bootstrap.apiServerIngress.annotations' not found")
      })

      it('should skip replaceResource in dryRun mode', async () => {
        terminalConfig.bootstrap.queueOptions = { dryRun: true }
        const items = [seed]
        const bootstrapper = await TestBootstrapper.create(terminalConfig, items)

        expect.hasAssertions()
        expectMocksToMatchSnapshots(mocks)
        expectBootstrapperToMatchSnapshots(bootstrapper, ...items)

        expect(logger.info).toBeCalledWith('Replacing resource networking.k8s.io/v1, Kind=Ingress was skipped in dry run mode')
      })
    })

    describe('shoot enabled', () => {
      const terminalConfig = {
        bootstrap: {
          disabled: false,
          shootDisabled: false
        }
      }

      it('should bootstrap a shoot cluster', async () => {
        const items = [...shootList]
        const bootstrapper = await TestBootstrapper.create(terminalConfig, items)

        expect.hasAssertions()
        expectMocksToMatchSnapshots(mocks)
        expectBootstrapperToMatchSnapshots(bootstrapper, ...items)
      })

      it('should not bootstrap shoot cluster', async () => {
        // bootstrap dummy whose seed does not have .spec.secretRef set
        const shoot = shootList[2]
        const items = [shoot]
        const { namespace, name } = shoot.metadata
        const bootstrapper = await TestBootstrapper.create(terminalConfig, items)

        expect.hasAssertions()
        expectMocksToMatchSnapshots(mocks)
        expectBootstrapperToMatchSnapshots(bootstrapper, ...items)

        expect(logger.info).toBeCalledWith(`Bootstrapping Shoot ${namespace}/${name} aborted as 'spec.secretRef' on the seed is missing.`)
      })

      it('should not bootstrap unreachable shoot cluster', async () => {
        // bootstrap unreachable whose seed is flagged as unreachable
        const shoot = shootList[3]
        const items = [shoot]
        const { namespace, name } = shoot.metadata
        const bootstrapper = await TestBootstrapper.create(terminalConfig, items)

        expect.hasAssertions()
        expectMocksToMatchSnapshots(mocks)
        expectBootstrapperToMatchSnapshots(bootstrapper, ...items)

        expect(logger.debug).toBeCalledWith(`Seed ${unreachableSeedName} is not reachable from the dashboard for shoot ${namespace}/${name}, bootstrapping aborted`)
      })

      it('should fail to bootstrap a shoot', async () => {
        const item = shootList[1]
        const notFound = createError(404, 'Shoot not found')
        mockConfigTerminal.mockReturnValue(createTerminalConfig(terminalConfig))
        const bootstrapper = new Bootstrapper(gardenClient)
        mocks.mockShootsGet.mockImplementationOnce((...args) => {
          return Promise.reject(notFound)
        })
        bootstrapper.bootstrapResource(item)

        await isDrained(bootstrapper)

        expect.hasAssertions()
        expectMocksToMatchSnapshots(mocks)
        expectBootstrapperToMatchSnapshots(bootstrapper, item)

        expect(logger.error).toBeCalledWith(`failed to bootstrap ${getDescription(item)}`, notFound)
      })

      it('should cancel a starting bootstrap task', async () => {
        const item = shootList[1]
        mockConfigTerminal.mockReturnValue(createTerminalConfig(terminalConfig))
        const bootstrapper = new Bootstrapper(gardenClient)
        bootstrapper.bootstrapResource(item)
        bootstrapper.on('task_started', () => bootstrapper.cancelTask(item))
        await isDrained(bootstrapper)

        expect.hasAssertions()
        expectMocksToMatchSnapshots(mocks)
        expectBootstrapperToMatchSnapshots(bootstrapper, item)

        expect(logger.debug).toBeCalledWith(`Canceling handler of ${getDescription(item)} as requested`)
      })

      it('should cancel a running bootstrap task', async () => {
        const item = shootList[1]
        mockConfigTerminal.mockReturnValue(createTerminalConfig(terminalConfig))
        const bootstrapper = new Bootstrapper(gardenClient)
        mocks.mockShootsGet.mockImplementationOnce((...args) => {
          bootstrapper.cancelTask(item)
          return Promise.resolve(fixtures.shoots.get(...args))
        })
        bootstrapper.bootstrapResource(item)

        await isDrained(bootstrapper)

        expect.hasAssertions()
        expectMocksToMatchSnapshots(mocks)
        expectBootstrapperToMatchSnapshots(bootstrapper, item)

        expect(logger.debug).toBeCalledWith(`Canceling handler of ${getDescription(item)} as requested after handling resource`)
      })

      it('should cancel a failed bootstrap task', async () => {
        const item = shootList[1]
        const notFound = createError(404, 'Shoot not found')
        mocks.mockShootsGet.mockImplementationOnce((...args) => {
          bootstrapper.cancelTask(item)
          return Promise.reject(notFound)
        })
        mockConfigTerminal.mockReturnValue(createTerminalConfig(terminalConfig))
        const bootstrapper = new Bootstrapper(gardenClient)
        bootstrapper.bootstrapResource(item)

        await isDrained(bootstrapper)

        expect.hasAssertions()
        expectMocksToMatchSnapshots(mocks)
        expectBootstrapperToMatchSnapshots(bootstrapper, item)

        expect(logger.debug).toBeCalledWith(`Handler canceled of ${getDescription(item)}`)
      })
    })

    describe('Bootstrapper object', () => {
      const terminalConfig = {
        bootstrap: {
          disabled: true
        }
      }

      const { mockShootsListAllNamespaces } = mocks

      let bootstrapper
      let object
      let mockBootstrapResource
      let mockCancel
      let mockIsBootstrapKindAllowed

      beforeEach(async () => {
        bootstrapper = await TestBootstrapper.create(terminalConfig)
        object = {
          kind: 'Shoot',
          metadata: {
            name: 'foo',
            uid: Math.floor(Math.random() * 1000).toString()
          }
        }
        mockBootstrapResource = jest.spyOn(bootstrapper, 'bootstrapResource')
        mockCancel = jest.spyOn(bootstrapper, 'cancel')
        mockIsBootstrapKindAllowed = jest.spyOn(bootstrapper, 'isBootstrapKindAllowed').mockReturnValue(true)
      })

      afterEach(() => {
        jest.clearAllMocks()
      })

      describe('#handleResourceEvent', () => {
        it('should handle an ADDED event', () => {
          bootstrapper.handleResourceEvent({ type: 'ADDED', object })
          expect(mockBootstrapResource).toBeCalledTimes(1)
          expect(mockBootstrapResource.mock.calls[0]).toEqual([object])
        })

        it('should handle a MODIFIED event', () => {
          bootstrapper.handleResourceEvent({ type: 'MODIFIED', object })
          expect(mockBootstrapResource).toBeCalledTimes(1)
          expect(mockBootstrapResource.mock.calls[0]).toEqual([object])
        })

        it('should handle a DELETED event', () => {
          bootstrapper.handleResourceEvent({ type: 'DELETED', object })
          expect(mockCancel).toBeCalledTimes(1)
          expect(mockCancel.mock.calls[0]).toEqual([object.metadata.uid])
        })
      })

      describe('#handleDependentShoots', () => {
        it('should keep failure in case there is any', async () => {
          mockShootsListAllNamespaces.mockResolvedValueOnce({
            items: [object]
          })
          bootstrapper.bootstrapState.setFailed(object, false)
          await bootstrapper.handleDependentShoots(seedName)
          expect(mockBootstrapResource).toBeCalledTimes(1)
          expect(mockBootstrapResource.mock.calls[0]).toEqual([object])
          expect(bootstrapper.bootstrapState.getValue(object)).toEqual({
            state: BootstrapStatusEnum.INITIAL,
            revision: undefined,
            failure: {
              date: expect.any(Date),
              counter: 1,
              doNotRetry: false
            }
          })
        })

        describe('#bootstrapStatus', () => {
          const expectBootstrapFn = (required, reason) => {
            return () => {
              const status = bootstrapper.bootstrapStatus(object)
              expect(mockIsBootstrapKindAllowed).toBeCalledTimes(1)
              expect(status).toEqual({ required, reason })
            }
          }
          const expectBootstrapIrrelevant = expectBootstrapFn(false, BootstrapReasonEnum.IRRELEVANT)
          const expectBootstrapRevisionChanged = expectBootstrapFn(true, BootstrapReasonEnum.REVISION_CHANGED)
          describe('when the resource is deleted', () => {
            beforeEach(() => {
              object.metadata.deletionTimestamp = new Date().toISOString()
            })

            it('should return that bootstrap is not required', () => {
              expect.hasAssertions()
              expectBootstrapIrrelevant()
            })
          })

          describe('when bootstrap is disabled', () => {
            beforeEach(() => {
              object.metadata.annotations = {
                'dashboard.gardener.cloud/terminal-bootstrap-disabled': 'true'
              }
            })

            it('should return that bootstrap is not required', () => {
              expect.hasAssertions()
              expectBootstrapIrrelevant()
            })
          })

          describe('when bootstrap is already in progress', () => {
            beforeEach(() => {
              bootstrapper.bootstrapState.setInProgress(object)
            })

            it('should return that bootstrap is not required', () => {
              expect.hasAssertions()
              expectBootstrapIrrelevant()
            })
          })

          describe('when bootstrap failed', () => {
            let state

            beforeEach(() => {
              bootstrapper.bootstrapState.setFailed(object, false)
              state = bootstrapper.bootstrapState.getValue(object)
            })

            describe('and retry is disabled', () => {
              beforeEach(() => {
                state.failure.doNotRetry = true
              })

              it('should return that bootstrap is not required', () => {
                expect.hasAssertions()
                expectBootstrapIrrelevant()
              })
            })

            describe('and no need to wait', () => {
              beforeEach(() => {
                state.failure.date = new Date(Date.now() - 86_400_000)
              })

              it('should return that bootstrap is not required', () => {
                expect.hasAssertions()
                expectBootstrapIrrelevant()
              })
            })
          })

          describe('when the seed shoot namespace exists', () => {
            beforeEach(() => {
              Object.assign(object, {
                spec: {
                  seedName
                },
                status: {
                  technicalID: 'shoot--bar--foo',
                  lastOperation: {
                    progress: 50
                  }
                }
              })
            })

            describe('and the resource is already bootstrapped', () => {
              beforeEach(() => {
                bootstrapper.bootstrapState.setSucceeded(object, { revision: 42 })
              })
              it('should return that bootstrap is not required', () => {
                expect.hasAssertions()
                expectBootstrapIrrelevant()
              })
            })
          })

          describe('when the resource is a seed', () => {
            beforeEach(() => {
              object.kind = 'Seed'
              object.metadata.annotations = {
                'seed.gardener.cloud/ingress-class': 'c',
                'dashboard.gardener.cloud/terminal-bootstrap-trigger': 't'
              }
              object.spec = {
                dns: {
                  ingressDomain: 'example.org'
                }
              }
              const revision = bootstrapRevision(object)
              bootstrapper.bootstrapState.setSucceeded(object, { revision })
            })

            it('should return that bootstrap is not required', () => {
              expect.hasAssertions()
              expectBootstrapIrrelevant()
            })

            describe('and the revision has changed', () => {
              beforeEach(() => {
                bootstrapper.bootstrapState.setSucceeded(object, { revision: 42 })
              })

              it('should return that bootstrap is not required', () => {
                expect.hasAssertions()
                expectBootstrapRevisionChanged()
              })
            })
          })
        })
      })

      describe('Bootstrapper class', () => {
        describe('#process', () => {
          it('should throw an error when running the handler', async () => {
            const error = new Error('Failed to run handler')
            const handler = {
              run () {
                return Promise.reject(error)
              }
            }
            await expect(promisify(Bootstrapper.process)(handler)).rejects.toThrowError(error)
          })
        })
      })
    })

    describe('Handler', () => {
      const id = '1'
      const description = 'description'

      it('should run a cancled handler', async () => {
        const mockRun = jest.fn()
        const handler = new Handler(mockRun, { id, description })
        expect(handler.id).toBe(id)
        expect(handler.description).toBe(description)
        expect(handler.session).toEqual({
          canceled: false
        })
        handler.cancel()
        expect(handler.session).toEqual({
          canceled: true
        })
        handler.run()
        expect(mockRun).toBeCalledTimes(1)
        expect(mockRun.mock.calls[0]).toEqual([{
          canceled: true
        }])
      })
    })
  })
})
