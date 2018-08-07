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

const { Client } = require('kubernetes-client')
const kubernetes = require('../kubernetes')
const { format: fmt } = require('util')

const spec = {
  swagger: '2.0',
  paths: {
    '/healthz': {
      get: {
        description: 'healthz check',
        schemes: [
          'https'
        ],
        operationId: 'healthzCheck',
        responses: {
          '200': {
            description: 'OK',
            content: {
              'text/plain': {
                schema: {
                  type: 'string'
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized'
          }
        }
      }
    }
  }
}

exports.check = async function ({user}) {
  let response
  try {
    const client = new Client({
      config: kubernetes.config(),
      spec
    })
    response = await client.healthz.get()
  } catch (error) {
    throw new Error(fmt('Could not reach Kubernetes apiserver healthz endpoint. Request failed with error: %s', error))
  }

  if (response.statusCode === 200) {
    return 'ok'
  } else {
    throw new Error(fmt('Kubernetes apiserver is not healthy. Healthz endpoint returned: %s (Status code: %s)', response.body, response.statusCode))
  }
}
