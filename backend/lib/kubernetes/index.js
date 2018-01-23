//
// Copyright 2018 by The Gardener Authors.
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
const Client = require('./Client')
const ClusterConfig = require('./ClusterConfig')
const Resources = require('./Resources')
const clientConfig = ClusterConfig.load()
const client = Client.create(clientConfig)
const baseClientConfig = _.pick(clientConfig, ['url', 'ca', 'insecureSkipTlsVerify'])

module.exports = {
  Client,
  ClusterConfig,
  Resources,
  client,
  clientConfig,
  baseClientConfig
}
