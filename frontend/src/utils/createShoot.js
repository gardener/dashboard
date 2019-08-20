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

export function getCloudProviderTemplate (infrastructureKind) {
  switch (infrastructureKind) {
    case 'aws':
      return {
        networks: {
          vpc: {
            cidr: '10.250.0.0/16'
          },
          internal: [
            '10.250.112.0/22'
          ],
          nodes: '10.250.0.0/16',
          public: [
            '10.250.96.0/22'
          ],
          workers: [
            '10.250.0.0/19'
          ]
        }
      }
    case 'azure':
      return {
        networks: {
          vnet: {
            cidr: '10.250.0.0/16'
          },
          nodes: '10.250.0.0/19',
          public: '10.250.96.0/22',
          workers: '10.250.0.0/19'
        }
      }
    case 'gcp':
      return {
        networks: {
          nodes: '10.250.0.0/19',
          workers: [
            '10.250.0.0/19'
          ]
        }
      }
    case 'openstack':
      return {
        networks: {
          nodes: '10.250.0.0/19',
          workers: [
            '10.250.0.0/19'
          ]
        }
      }
    case 'alicloud':
      return {
        networks: {
          vpc: {
            cidr: '10.250.0.0/16'
          },
          nodes: '10.250.0.0/16',
          workers: [
            '10.250.0.0/19'
          ]
        }
      }
  }
}
