//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const config = require('../lib/config')
const logger = require('../lib/logger')
const {
  getWildcardIngressDomainForSeed,
  getGardenTerminalHostClusterSecretRef,
  getConfigValue,
  isSeedUnreachable,
  getKubeApiServerHostForShoot,
  handleSeed,
  handleShoot,
  ensureTrustedCertForGardenTerminalHostApiServer,
  ensureTrustedCertForSeedApiServer,
  bootstrapRevision,
  getSeedIngressDomain
} = require('../lib/terminal/utils')
const fixtures = require('../__fixtures__')

describe('terminal', () => {
  describe('utils', () => {
    const mockConfigTerminal = config.mockTerminal
    const mockConfigUnreachableSeeds = config.mockUnreachableSeeds

    afterEach(() => {
      jest.clearAllMocks()
    })

    describe('#getWildcardIngressDomainForSeed', () => {
      it('should return the wildcard ingress domain for a seed', () => {
        const ingressDomain = 'ingress.foo-east.infra1.example.org'
        const seed = { spec: { dns: { ingressDomain } } }
        const wildcardIngressDomain = getWildcardIngressDomainForSeed(seed)
        expect(wildcardIngressDomain).toBe(`*.${ingressDomain}`)
      })
    })

    describe('#getGardenTerminalHostClusterSecretRef', () => {
      const client = {
        core: {
          secrets: {
            list: jest.fn()
          }
        }
      }

      describe('when refType is seedRef', () => {
        it('should return the secretRef', async () => {
          const seedName = 'infra1-seed2'
          const seed = fixtures.seeds.get(seedName)
          mockConfigTerminal.mockReturnValue({
            gardenTerminalHost: {
              seedRef: seedName
            }
          })
          await expect(getGardenTerminalHostClusterSecretRef(client)).resolves.toEqual(seed.spec.secretRef)
          expect(mockConfigTerminal).toBeCalledTimes(2)
        })

        it('should fail with seed not found', async () => {
          const seedName = 'infra1-seed3'
          mockConfigTerminal.mockReturnValue({
            gardenTerminalHost: {
              seedRef: seedName
            }
          })
          await expect(getGardenTerminalHostClusterSecretRef()).rejects.toThrow(`There is no seed with name ${seedName}`)
          expect(mockConfigTerminal).toBeCalledTimes(2)
        })
      })

      describe('when refType is shootRef', () => {
        it('should return the secretRef', async () => {
          const shootName = 'foo'
          mockConfigTerminal.mockReturnValue({
            gardenTerminalHost: {
              shootRef: {
                name: shootName
              }
            }
          })
          await expect(getGardenTerminalHostClusterSecretRef()).resolves.toEqual({
            namespace: 'garden',
            name: `${shootName}.kubeconfig`
          })
          expect(mockConfigTerminal).toBeCalledTimes(3)
        })
      })

      describe('when refType is unknwon', () => {
        it('should return the secretRef', async () => {
          mockConfigTerminal.mockReturnValue({
            gardenTerminalHost: {}
          })
          await expect(getGardenTerminalHostClusterSecretRef()).rejects.toThrow('unknown refType undefined')
          expect(mockConfigTerminal).toBeCalledTimes(1)
        })
      })
    })

    describe('#getConfigValue', () => {
      it('should fail to get a config value', () => {
        const path = 'foo.bar'
        expect(() => getConfigValue(path)).toThrow(`no config with ${path} found`)
      })
    })

    describe('#isSeedUnreachable', () => {
      it('should fail to get a config value', () => {
        mockConfigUnreachableSeeds.mockReturnValueOnce({
          matchLabels: undefined
        })
        expect(isSeedUnreachable()).toBe(false)
        expect(config.mockUnreachableSeeds).toBeCalledTimes(1)
      })
    })

    describe('#getKubeApiServerHostForShoot', () => {
      const namespace = 'garden-foo'
      const name = 'bar'
      let shoot

      beforeEach(() => {
        shoot = fixtures.shoots.get(namespace, name)
      })

      it('should return the hostname', () => {
        expect(getKubeApiServerHostForShoot(shoot)).toMatch('k-cdi5hc.ingress.foo-east.infra1.example.org')
      })
    })

    describe('#handleSeed', () => {
      const client = fixtures.clients.gardenClient
      const name = 'infra1-seed'
      let seed

      beforeEach(() => {
        seed = fixtures.seeds.get(name)
      })

      it('should not handle a deleted seed', async () => {
        seed.metadata.deletionTimestamp = new Date().toISOString()
        await expect(handleSeed(client, seed)).resolves.toBeUndefined()
        expect(logger.debug).toBeCalledWith(`Seed ${name} is marked for deletion, bootstrapping aborted`)
      })
    })

    describe('#handleShoot', () => {
      const client = fixtures.clients.gardenClient
      const namespace = 'garden-foo'
      const name = 'bar'
      let shoot
      let seed

      beforeEach(() => {
        shoot = fixtures.shoots.get(namespace, name)
        seed = fixtures.seeds.get(shoot.spec.seedName)
      })

      it('should not handle a deleted shoot', async () => {
        shoot.metadata.deletionTimestamp = new Date().toISOString()
        await expect(handleShoot(client, shoot, seed)).resolves.toBeUndefined()
        expect(logger.debug).toBeCalledWith(`Shoot ${namespace}/${name} is marked for deletion, bootstrapping aborted`)
      })

      it('should fail if the technicalID is missing', async () => {
        delete shoot.status.technicalID
        await expect(handleShoot(client, shoot, seed)).rejects.toThrow(`could not get namespace on seed for shoot ${namespace}/${name}`)
      })
    })

    describe('#ensureTrustedCertForGardenTerminalHostApiServer', () => {
      const client = fixtures.clients.gardenClient

      it('should fail for unknwon refType', async () => {
        mockConfigTerminal.mockReturnValue({
          gardenTerminalHost: {}
        })
        await expect(ensureTrustedCertForGardenTerminalHostApiServer(client)).rejects.toThrow('bootstrapping garden terminal host cluster for refType undefined not yet implemented')
      })
    })

    describe('#ensureTrustedCertForSeedApiServer', () => {
      const {
        gardenClient: client,
        mocks: {
          mockSoilIngressesMergePatch
        }
      } = fixtures.clients
      const name = 'soil-infra1'
      let seed

      beforeEach(() => {
        seed = fixtures.seeds.get(name)
      })

      it('should fail for unknwon refType', async () => {
        delete seed.spec.secretRef
        await expect(ensureTrustedCertForSeedApiServer(client, seed)).resolves.toBeUndefined()
        expect(logger.info).toBeCalledWith(`Bootstrapping Seed ${name} aborted as 'spec.secretRef' on the seed is missing`)
      })

      it('should set the ingress class', async () => {
        const terminalConfig = fixtures.helper.createTerminalConfig({
          gardenTerminalHost: {
            seedRef: name
          },
          bootstrap: {
            disabled: false,
            seedDisabled: false
          }
        })
        seed.metadata.annotations = {
          'seed.gardener.cloud/ingress-class': 'test'
        }
        mockConfigTerminal.mockReturnValue(terminalConfig)
        await expect(ensureTrustedCertForSeedApiServer(client, seed)).resolves.toBeUndefined()
        expect(mockSoilIngressesMergePatch).toBeCalledTimes(1)
        expect(mockSoilIngressesMergePatch.mock.calls[0]).toEqual([
          'default',
          `dashboard-terminal-kube-apiserver-${name}`,
          expect.objectContaining({
            apiVersion: 'networking.k8s.io/v1',
            kind: 'Ingress',
            metadata: expect.objectContaining({
              name: `dashboard-terminal-kube-apiserver-${name}`
            }),
            spec: expect.objectContaining({
              ingressClassName: 'test'
            })
          })
        ])
      })
    })

    describe('#bootstrapRevision', () => {
      it('should return undefined when no seed is given', () => {
        expect(bootstrapRevision()).toBeUndefined()
      })
    })

    describe('#getSeedIngressDomain', () => {
      const ingressDomain = 'example.org'
      it('should return the dns.ingressDomain', () => {
        const seed = { spec: { dns: { ingressDomain } } }
        expect(getSeedIngressDomain(seed)).toBe(ingressDomain)
      })

      it('should return the ingress.domain', () => {
        const seed = { spec: { ingress: { domain: ingressDomain } } }
        expect(getSeedIngressDomain(seed)).toBe(ingressDomain)
      })
    })
  })
})
