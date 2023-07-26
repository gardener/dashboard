//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { createPinia } from 'pinia'
import { useCloudProfileStore } from '@/store/cloudProfile'

describe('stores', () => {
  describe('cloudProfile', () => {
    describe('#availableKubernetesUpdatesForShoot', () => {
      const kubernetesVersions = [
        {
          classification: 'preview',
          version: '2.0.0',
        },
        {
          classification: 'supported',
          version: '1.18.3',
        },
        {
          expirationDate: '2020-01-31T23:59:59Z', // expired
          version: '1.18.2',
        },
        {
          classification: 'supported',
          version: '1.17.7',
        },
        {
          classification: 'supported',
          version: '1.16.10',
        },
        {
          classification: 'deprecated',
          expirationDate: '2120-08-31T23:59:59Z',
          version: '1.16.9',
        },
        {
          version: '1.15.0',
        },
      ]

      let store

      beforeEach(() => {
        const pinia = createPinia()
        store = useCloudProfileStore(pinia)
        store.list = [{
          metadata: {
            name: 'foo',
          },
          data: {
            kubernetes: {
              versions: kubernetesVersions,
            },
          },
        }]
      })

      it('should return available K8sUpdates for given version', () => {
        const availableK8sUpdates = store.availableKubernetesUpdatesForShoot('1.16.9', 'foo')
        expect(availableK8sUpdates.minor[0]).toEqual(expect.objectContaining(kubernetesVersions[1]))
        expect(availableK8sUpdates.patch[0]).toEqual(expect.objectContaining(kubernetesVersions[4]))
        expect(availableK8sUpdates.major[0]).toEqual(expect.objectContaining(kubernetesVersions[0]))
      })

      it('should differentiate between patch/minor/major available K8sUpdates for given version, filter out expired', () => {
        const availableK8sUpdates = store.availableKubernetesUpdatesForShoot('1.16.9', 'foo')
        expect(availableK8sUpdates.patch.length).toBe(1)
        expect(availableK8sUpdates.minor.length).toBe(2)
        expect(availableK8sUpdates.major.length).toBe(1)
      })
    })

    describe('k8s update functions', () => {
      const kubernetesVersions = [
        {
          version: '1.1.1',
          expirationDate: '2119-04-05T01:02:03Z', // not expired
        },
        {
          version: '1.1.2',
          expirationDate: '2119-04-05T01:02:03Z', // not expired
        },
        {
          version: '1.2.4',
        },
        {
          classification: 'preview',
          version: '1.2.5',
        },
        {
          version: '1.3.4',
        },
        {
          version: '1.3.5',
        },
        {
          classification: 'preview',
          version: '1.4.0',
        },
        {
          version: '1.5.0',
          expirationDate: '2019-04-05T01:02:03Z', // expired
        },
        {
          version: '3.3.2',
        },
      ]

      let store

      beforeEach(() => {
        const pinia = createPinia()
        store = useCloudProfileStore(pinia)
        store.list = [{
          metadata: {
            name: 'foo',
          },
          data: {
            kubernetes: {
              versions: kubernetesVersions,
            },
          },
        }]
      })

      describe('#kubernetesVersionIsNotLatestPatch', () => {
        it('selected kubernetes version should be latest (multiple same minor)', () => {
          const result = store.kubernetesVersionIsNotLatestPatch(kubernetesVersions[1].version, 'foo')
          expect(result).toBe(false)
        })

        it('selected kubernetes version should be latest (one minor, one major, one preview update available)', () => {
          const result = store.kubernetesVersionIsNotLatestPatch(kubernetesVersions[2].version, 'foo')
          expect(result).toBe(false)
        })

        it('selected kubernetes version should not be latest', () => {
          const result = store.kubernetesVersionIsNotLatestPatch(kubernetesVersions[0].version, 'foo')
          expect(result).toBe(true)
        })
      })

      describe('#k8sVersionUpdatePathAvailable', () => {
        it('selected kubernetes version should have update path (minor update available)', () => {
          const result = store.kubernetesVersionUpdatePathAvailable(kubernetesVersions[3].version, 'foo')
          expect(result).toBe(true)
        })

        it('selected kubernetes version should have update path (patch update available)', () => {
          const result = store.kubernetesVersionUpdatePathAvailable(kubernetesVersions[4].version, 'foo')
          expect(result).toBe(true)
        })

        it('selected kubernetes version should not have update path (minor update is preview)', () => {
          const result = store.kubernetesVersionUpdatePathAvailable(kubernetesVersions[5].version, 'foo')
          expect(result).toBe(false)
        })

        it('selected kubernetes version should not have update path (no next minor version update available)', () => {
          const result = store.kubernetesVersionUpdatePathAvailable(kubernetesVersions[7].version, 'foo')
          expect(result).toBe(false)
        })
      })

      describe('#k8sVersionExpirationForShoot', () => {
        it('should be info level (patch avialable, auto update enabled))', () => {
          const versionExpirationWarning = store.kubernetesVersionExpirationForShoot(kubernetesVersions[0].version, 'foo', true)
          expect(versionExpirationWarning).toEqual({
            expirationDate: kubernetesVersions[0].expirationDate,
            isValidTerminationDate: true,
            severity: 'info',
          })
        })

        it('should be warning level (patch available, auto update disabled))', () => {
          const versionExpirationWarning = store.kubernetesVersionExpirationForShoot(kubernetesVersions[0].version, 'foo', false)
          expect(versionExpirationWarning).toEqual({
            expirationDate: kubernetesVersions[0].expirationDate,
            isValidTerminationDate: true,
            severity: 'warning',
          })
        })

        it('should be warning level (update available, auto update enabled / disabled))', () => {
          let versionExpirationWarning = store.kubernetesVersionExpirationForShoot(kubernetesVersions[1].version, 'foo', true)
          expect(versionExpirationWarning).toEqual({
            expirationDate: kubernetesVersions[1].expirationDate,
            isValidTerminationDate: true,
            severity: 'warning',
          })

          versionExpirationWarning = store.kubernetesVersionExpirationForShoot(kubernetesVersions[1].version, 'foo', false)
          expect(versionExpirationWarning).toEqual({
            expirationDate: kubernetesVersions[1].expirationDate,
            isValidTerminationDate: true,
            severity: 'warning',
          })
        })

        it('should be error level (no update path available))', () => {
          const versionExpirationWarning = store.kubernetesVersionExpirationForShoot(kubernetesVersions[7].version, 'foo', false)
          expect(versionExpirationWarning).toEqual({
            expirationDate: kubernetesVersions[7].expirationDate,
            isValidTerminationDate: false,
            severity: 'error',
          })
        })

        it('should be error level (version not expired))', () => {
          const versionExpirationWarning = store.kubernetesVersionExpirationForShoot(kubernetesVersions[8].version, 'foo', true)
          expect(versionExpirationWarning).toBeUndefined()
        })
      })
    })
    describe('machine image update functions', () => {
      const sampleMachineImages = [
        {
          name: 'gardenlinux',
          versions: [{
            version: '1.1.1',
            expirationDate: '2119-04-05T01:02:03Z', // not expired
            classification: 'supported',
          }],
        },
        {
          name: 'gardenlinux2',
          versions: [{
            version: '1.2.2',
            classification: 'supported',
          }],
        },
        {
          name: 'gardenlinux3',
          versions: [{
            version: '1.3.2',
            classification: 'supported',
          }],
        },
        {
          name: 'gardenlinux4',
          versions: [{
            version: '1.3.3',
            expirationDate: '2119-04-05T01:02:03Z', // not expired
            classification: 'preview',
          }],
        },
        {
          name: 'coreos',
          versions: [{
            version: '3.3.2',
            expirationDate: '2019-04-05T01:02:03Z', // expired
            classification: 'supported',
          }],
        },
        {
          name: 'gardenlinux5',
          versions: [{
            version: '1.3.4',
            classification: 'deprecated',
          }],
        },
        {
          name: 'gardenlinux6',
          versions: [{
            version: '1.4.4',
            classification: 'preview',
          }],
        },
      ]

      let store

      beforeEach(() => {
        const pinia = createPinia()
        store = useCloudProfileStore(pinia)
        store.list = [{
          metadata: {
            name: 'foo',
          },
          data: {
            machineImages: sampleMachineImages,
          },
        }]
      })

      function generateWorkerGroups (machineImages) {
        return machineImages.map(machineImage => {
          return {
            name: 'worker',
            machine: {
              type: 'type',
              image: {
                name: machineImage.name,
                version: machineImage.versions[0].version,
              },
            },
          }
        })
      }

      function flattenMachineImage (machineImage) {
        return {
          name: machineImage.name,
          ...machineImage.versions[0],
        }
      }

      describe('#expiringWorkerGroupsForShoot', () => {
        it('one should be info level (update available, auto update enabled))', () => {
          const workers = generateWorkerGroups([
            sampleMachineImages[0],
            sampleMachineImages[1],
          ])
          const expiredWorkerGroups = store.expiringWorkerGroupsForShoot(workers, 'foo', true)

          expect(expiredWorkerGroups).toHaveLength(1)
          expect(expiredWorkerGroups[0]).toEqual(expect.objectContaining({
            ...flattenMachineImage(sampleMachineImages[0]),
            workerName: workers[0].name,
            isValidTerminationDate: true,
            severity: 'info',
          }))
        })

        it('one should be warning level (update available, auto update disabled))', () => {
          const workers = generateWorkerGroups([
            sampleMachineImages[0],
          ])
          const expiredWorkerGroups = store.expiringWorkerGroupsForShoot(workers, 'foo', false)
          expect(expiredWorkerGroups).toBeInstanceOf(Array)
          expect(expiredWorkerGroups).toHaveLength(1)
          expect(expiredWorkerGroups[0]).toEqual(expect.objectContaining({
            ...flattenMachineImage(sampleMachineImages[0]),
            workerName: workers[0].name,
            isValidTerminationDate: true,
            severity: 'warning',
          }))
        })

        it('one should be info level, two error (update available, auto update enabled))', () => {
          const workers = generateWorkerGroups([
            sampleMachineImages[0],
            sampleMachineImages[1],
            sampleMachineImages[3],
            sampleMachineImages[4],
          ])
          const expiredWorkerGroups = store.expiringWorkerGroupsForShoot(workers, 'foo', true)
          expect(expiredWorkerGroups).toBeInstanceOf(Array)
          expect(expiredWorkerGroups).toHaveLength(3)
          expect(expiredWorkerGroups[0]).toEqual(expect.objectContaining({
            ...flattenMachineImage(sampleMachineImages[0]),
            workerName: workers[0].name,
            isValidTerminationDate: true,
            severity: 'info',
          }))
          expect(expiredWorkerGroups[1]).toEqual(expect.objectContaining({
            ...flattenMachineImage(sampleMachineImages[3]),
            workerName: workers[2].name,
            isValidTerminationDate: true,
            severity: 'error',
          }))
          expect(expiredWorkerGroups[2]).toEqual(expect.objectContaining({
            ...flattenMachineImage(sampleMachineImages[4]),
            workerName: workers[3].name,
            isValidTerminationDate: false,
            severity: 'error',
          }))
        })

        it('should be empty array (ignore versions without expiration date))', () => {
          const workers = generateWorkerGroups([
            sampleMachineImages[1],
            sampleMachineImages[2],
          ])
          const expiredWorkerGroups = store.expiringWorkerGroupsForShoot(workers, 'foo', true)
          expect(expiredWorkerGroups).toBeInstanceOf(Array)
          expect(expiredWorkerGroups).toHaveLength(0)
        })
      })
    })
  })
})
