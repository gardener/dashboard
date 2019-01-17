//
// Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

module.exports = {
  Healthz: {
    swagger: '2.0',
    paths: {
      '/healthz': {
        get: {
          description: 'healthz check',
          schemes: ['https'],
          operationId: 'healthzCheck',
          responses: {
            '200': { description: 'OK' },
            '401': { description: 'Unauthorized' },
            '503': { description: 'Unhealthy' }
          }
        }
      }
    }
  },
  APIRegistration: {
    swagger: '2.0',
    paths: {
      '/apis/apiregistration.k8s.io/v1beta1/apiservices/{name}': {
        'get': {
          'description': 'read the specified APIService',
          'consumes': [
            '*/*'
          ],
          'produces': [
            'application/json',
            'application/yaml',
            'application/vnd.kubernetes.protobuf'
          ],
          'schemes': [
            'https'
          ],
          'tags': [
            'apiregistration_v1beta1'
          ],
          'operationId': 'readApiregistrationV1beta1APIService',
          'parameters': [
            {
              'uniqueItems': true,
              'type': 'boolean',
              'description': 'Should the export be exact.  Exact export maintains cluster-specific fields like Namespace.',
              'name': 'exact',
              'in': 'query'
            },
            {
              'uniqueItems': true,
              'type': 'boolean',
              'description': 'Should this value be exported.  Export strips fields that a user can not specify.',
              'name': 'export',
              'in': 'query'
            }
          ],
          'responses': {
            '200': {
              'description': 'OK',
              'schema': {
                '$ref': '#/definitions/io.k8s.kube-aggregator.pkg.apis.apiregistration.v1beta1.APIService'
              }
            },
            '401': {
              'description': 'Unauthorized'
            }
          },
          'x-kubernetes-action': 'get',
          'x-kubernetes-group-version-kind': {
            'group': 'apiregistration.k8s.io',
            'kind': 'APIService',
            'version': 'v1beta1'
          }
        }
      }
    }
  }
}
