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

import map from 'lodash/map'

export function getZonesObjectArray (zones) {
  switch (zones.length) {
    case 1:
      return [{
        name: zones[0],
        internal: '10.250.112.0/22',
        public: '10.250.96.0/22',
        workers: '10.250.0.0/19'
      }]
    case 2:
      return [{
        name: zones[0],
        internal: '10.250.112.0/23',
        public: '10.250.96.0/23',
        workers: '10.250.0.0/20'
      },
      {
        name: zones[1],
        internal: '10.250.114.0/23',
        public: '10.250.98.0/23',
        workers: '10.250.16.0/20'
      }]
    case 3:
      return [{
        name: zones[0],
        internal: '10.250.112.0/24',
        public: '10.250.96.0/24',
        workers: '10.250.0.0/21'
      },
      {
        name: zones[1],
        internal: '10.250.113.0/24',
        public: '10.250.97.0/24',
        workers: '10.250.8.0/21'
      },
      {
        name: zones[2],
        internal: '10.250.114.0/24',
        public: '10.250.98.0/24',
        workers: '10.250.16.0/21'
      }]
    default:
      return map(zones, zone => {
        return {
          name: zone
        }
      })
  }
}

export function getCloudProviderTemplate (infrastructureKind) {
  switch (infrastructureKind) {
    case 'aws':
      return {
        type: 'aws',
        infrastructureConfig: {
          apiVersion: 'aws.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'InfrastructureConfig',
          networks: {
            vpc: {
              cidr: '10.250.0.0/16'
            }
          }
        }
      }
    case 'azure':
      return {
        type: 'azure',
        infrastructureConfig: {
          apiVersion: 'azure.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'InfrastructureConfig',
          networks: {
            vnet: {
              name: 'my-vnet',
              cidr: '10.250.0.0/16'
            },
            workers: '10.250.0.0/19'
          }
        }
      }
    case 'gcp':
      return {
        type: 'gcp',
        infrastructureConfig: {
          apiVersion: 'gcp.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'InfrastructureConfig',
          networks: {
            worker: '10.242.0.0/19'
          }
        }
      }
    case 'openstack':
      return {
        type: 'openstack',
        infrastructureConfig: {
          apiVersion: 'openstack.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'InfrastructureConfig',
          networks: {
            worker: '10.250.0.0/19'
          }
        }
      }
    case 'alicloud':
      return {
        type: 'aws',
        infrastructureConfig: {
          apiVersion: 'aws.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'InfrastructureConfig',
          networks: {
            vpc: {
              cidr: '10.250.0.0/16'
            }
          }
        }
      }
  }
}
