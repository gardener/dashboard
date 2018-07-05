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

const _ = require('lodash')
const axios = require('axios')
const https = require('https')
const config = require('../config')
const kubernetes = require('../kubernetes')
const { format: fmt } = require('util')

function Core ({auth}) {
  return kubernetes.core({auth})
}

exports.check = async function ({user}) {
  const core = Core(user)
  const ns = core.namespaces('garden')
  const api = ns.serviceaccounts.api
  const server = _.get(config, 'apiServerUrl', api.url)
  const ca = _.get(config, 'jwks.ca')
  const url = server + '/healthz'
  const reqConfig = {
    headers: {
      'Authorization': 'bearer ' + user.auth.bearer
    }
  }
  const instance = axios.create({
    httpsAgent: new https.Agent({
      ca
    })
  })

  let response
  try {
    response = await instance.get(url, reqConfig)
    console.log(response)
  } catch (error) {
    throw new Error(fmt('Could not reach Kubernetes apiserver healthz endpoint. Request failed with error: %s', error))
  }
  if (response.status === 200) {
    return 'ok'
  } else {
    throw new Error(fmt('Kubernetes apiserver is not healthy. Healthz endpoint returned: %s (Status code: %s)', response.data, response.status))
  }
}
