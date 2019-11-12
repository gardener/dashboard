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

'use strict'

const resources = require('./resources')

const config = require('./config')(process.env)
const debug = require('./debug')
const { mergeConfig } = require('./util')

function createClient (options) {
  options = debug.attach(options)
  return resources(mergeConfig(options, config))
}

exports = module.exports = createClient
exports.api = () => {
  return (req, res, next) => {
    const { auth } = req.user
    req.user.api = createClient({ auth })
    next()
  }
}
