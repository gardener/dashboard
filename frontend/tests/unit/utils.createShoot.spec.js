//
// Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

import { splitCIDR, getZonesNetworkConfiguration, findFreeNetworks } from '@/utils/createShoot'

describe('utils', () => {
  describe('createShoot', () => {
    describe('#splitCIDR', () => {
      it('should not split the cidr', () => {
        const splittedCidrs = splitCIDR('10.250.0.0/16', 1)

        expect(splittedCidrs).toBeInstanceOf(Array)
        expect(splittedCidrs).toHaveLength(1)
        expect(splittedCidrs[0]).toBe('10.250.0.0/16')
      })

      it('should split the cidr into 2 networks', () => {
        const splittedCidrs = splitCIDR('10.250.0.0/16', 2)

        expect(splittedCidrs).toBeInstanceOf(Array)
        expect(splittedCidrs).toHaveLength(2)
        expect(splittedCidrs[0]).toBe('10.250.0.0/17')
        expect(splittedCidrs[1]).toBe('10.250.128.0/17')
      })

      it('should split the cidr into 4 networks', () => {
        const splittedCidrs = splitCIDR('10.0.128.0/19', 4)

        expect(splittedCidrs).toBeInstanceOf(Array)
        expect(splittedCidrs).toHaveLength(4)
        expect(splittedCidrs[0]).toBe('10.0.128.0/21')
        expect(splittedCidrs[1]).toBe('10.0.136.0/21')
        expect(splittedCidrs[2]).toBe('10.0.144.0/21')
        expect(splittedCidrs[3]).toBe('10.0.152.0/21')
      })

      it('should split the cidr into 5 networks', () => {
        const splittedCidrs = splitCIDR('10.250.0.0/16', 5)

        expect(splittedCidrs).toBeInstanceOf(Array)
        expect(splittedCidrs).toHaveLength(5)
        expect(splittedCidrs[0]).toBe('10.250.0.0/19')
        expect(splittedCidrs[1]).toBe('10.250.32.0/19')
        expect(splittedCidrs[2]).toBe('10.250.64.0/19')
        expect(splittedCidrs[3]).toBe('10.250.96.0/19')
        expect(splittedCidrs[4]).toBe('10.250.128.0/19')
      })

      it('should not break when zone count is zero', () => {
        const splittedCidrs = splitCIDR('10.250.0.0/16', 0)

        expect(splittedCidrs).toBeInstanceOf(Array)
        expect(splittedCidrs).toHaveLength(0)
      })
    })

    describe('#findFreeNetworks', () => {
      it('should find free networks', () => {
        const existingZonesNetworkConfiguration = [
          {
            name: 'barZone',
            workers: '10.251.64.0/19',
            public: '10.251.96.0/20',
            internal: '10.251.112.0/20'
          },
          {
            name: 'fooZone',
            workers: '10.251.0.0/19',
            public: '10.251.32.0/20',
            internal: '10.251.48.0/20'
          }
        ]
        const workerCIDR = '10.251.0.0/16'

        const freeNetworks = findFreeNetworks(existingZonesNetworkConfiguration, workerCIDR, 'aws', 4)
        expect(freeNetworks).toBeInstanceOf(Array)
        expect(freeNetworks).toHaveLength(2)
      })

      it('should not find free networks if none available', () => {
        const existingZonesNetworkConfiguration = [
          {
            name: 'barZone',
            workers: '10.251.64.0/19',
            public: '10.251.96.0/20',
            internal: '10.251.112.0/20'
          },
          {
            name: 'fooZone',
            workers: '10.251.0.0/19',
            public: '10.251.32.0/20',
            internal: '10.251.48.0/20'
          },
          {
            name: 'bazZone',
            workers: '10.251.128.0/19',
            public: '10.251.160.0/20',
            internal: '10.251.176.0/20'
          },
          {
            name: 'fooBarZone',
            workers: '10.251.192.0/19',
            public: '10.251.224.0/20',
            internal: '10.251.240.0/20'
          }
        ]
        const workerCIDR = '10.251.0.0/16'

        const freeNetworks = findFreeNetworks(existingZonesNetworkConfiguration, workerCIDR, 'aws', 4)
        expect(freeNetworks).toBeInstanceOf(Array)
        expect(freeNetworks).toHaveLength(0)
      })

      it('should not find free networks if network size is custom', () => {
        const existingZonesNetworkConfiguration = [
          {
            name: 'barZone',
            workers: '10.251.64.0/18',
            public: '10.251.96.0/20',
            internal: '10.251.112.0/20'
          }
        ]
        const workerCIDR = '10.251.0.0/16'

        const freeNetworks = findFreeNetworks(existingZonesNetworkConfiguration, workerCIDR, 'aws', 4)
        expect(freeNetworks).toBeInstanceOf(Array)
        expect(freeNetworks).toHaveLength(0)
      })

      it('should return networks for all zones if existingZonesNetworkConfiguration is undefined', () => {
        const workerCIDR = '10.251.0.0/16'

        const freeNetworks = findFreeNetworks(undefined, workerCIDR, 'aws', 4)
        expect(freeNetworks).toBeInstanceOf(Array)
        expect(freeNetworks).toHaveLength(4)
      })
    })

    describe('#getZonesNetworkConfiguration', () => {
      const workers = [
        {
          zones: [
            'fooZone'
          ]
        },
        {
          zones: [
            'fooZone',
            'barZone'
          ]
        }
      ]

      const customZonesNetworkConfiguration = [
        {
          name: 'fooZone',
          workers: '10.250.0.0/18',
          public: '10.250.32.0/19',
          internal: '10.250.48.0/19'
        },
        {
          name: 'barZone',
          workers: '10.250.64.0/18',
          public: '10.250.96.0/19',
          internal: '10.250.112.0/19'
        }
      ]

      const existingZonesNetworkConfiguration = [
        {
          name: 'fooZone',
          workers: '10.250.0.0/19',
          public: '10.250.32.0/20',
          internal: '10.250.48.0/20'
        }
      ]

      it('should return undefined for infrastructures that do not require network config for zones', () => {
        const zonesNetworkConfiguration = getZonesNetworkConfiguration(undefined, workers, 'azure', 3)
        expect(zonesNetworkConfiguration).toBeUndefined()
      })

      it('should return initial network config', () => {
        const zonesNetworkConfiguration = getZonesNetworkConfiguration(undefined, workers, 'aws', 3)
        expect(zonesNetworkConfiguration).toBeInstanceOf(Array)
        expect(zonesNetworkConfiguration).toHaveLength(2)
      })

      it('should keep network config if zones are the same', () => {
        const zonesNetworkConfiguration = getZonesNetworkConfiguration(customZonesNetworkConfiguration, workers, 'aws', 3)
        expect(zonesNetworkConfiguration).toBeInstanceOf(Array)
        expect(zonesNetworkConfiguration).toHaveLength(2)
        expect(zonesNetworkConfiguration).toEqual(customZonesNetworkConfiguration)
      })

      it('should reset network config if zones are not the same', () => {
        const workersWithDifferentZones = [
          {
            zones: [
              'fooZone'
            ]
          },
          {
            zones: [
              'fooZone',
              'bazZone'
            ]
          }
        ]
        const zonesNetworkConfiguration = getZonesNetworkConfiguration(customZonesNetworkConfiguration, workersWithDifferentZones, 'aws', 3)
        expect(zonesNetworkConfiguration).toBeInstanceOf(Array)
        expect(zonesNetworkConfiguration).toHaveLength(2)
        expect(zonesNetworkConfiguration).not.toEqual(customZonesNetworkConfiguration)
      })

      it('should return existing unused zone network configurations', () => {
        const oneZoneWorkers = [
          {
            zones: [
              'barZone'
            ]
          }
        ]

        const zonesNetworkConfiguration = getZonesNetworkConfiguration(customZonesNetworkConfiguration, oneZoneWorkers, 'aws', 3, '10.250.0.0/16')
        expect(zonesNetworkConfiguration).toBeInstanceOf(Array)
        expect(zonesNetworkConfiguration).toHaveLength(2)
        expect(zonesNetworkConfiguration).toEqual(customZonesNetworkConfiguration)
      })

      it('should extend network config for existing shoot if additional zones are added', () => {
        const workersWithDifferentZones = [
          {
            zones: [
              'fooZone',
              'bazZone'
            ]
          },
          {
            zones: [
              'fooZone',
              'barZone'
            ]
          }
        ]

        const newZonesNetworkConfiguration = [
          ...existingZonesNetworkConfiguration,
          {
            name: 'bazZone',
            workers: '10.250.64.0/19',
            public: '10.250.96.0/20',
            internal: '10.250.112.0/20'
          },
          {
            name: 'barZone',
            workers: '10.250.128.0/19',
            public: '10.250.160.0/20',
            internal: '10.250.176.0/20'
          }
        ]

        const zonesNetworkConfiguration = getZonesNetworkConfiguration(existingZonesNetworkConfiguration, workersWithDifferentZones, 'aws', 3, '10.250.0.0/16')
        expect(zonesNetworkConfiguration).toBeInstanceOf(Array)
        expect(zonesNetworkConfiguration).toHaveLength(3)
        expect(zonesNetworkConfiguration).toEqual(newZonesNetworkConfiguration)
      })

      it('should not be able to extend network config for existing shoot if network size is custom', () => {
        const workersWithDifferentZones = [
          {
            zones: [
              'fooZone',
              'bazZone'
            ]
          },
          {
            zones: [
              'fooZone',
              'barZone'
            ]
          }
        ]

        const zonesNetworkConfiguration = getZonesNetworkConfiguration(customZonesNetworkConfiguration, workersWithDifferentZones, 'aws', 3, '10.250.0.0/16')
        expect(zonesNetworkConfiguration).toBeUndefined()
      })
    })
  })
})
