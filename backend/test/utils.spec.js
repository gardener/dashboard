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

const { cleanKubeconfig } = require('../lib/utils')
const { safeDump, safeLoad } = require('js-yaml')
const { merge } = require('lodash')

describe('utils', function () {
  /* eslint no-unused-expressions: 0 */
  describe('#cleanKubeconfig', function () {
    it('should remove unnecessary properties', function () {
      const kubeconfig = {
        clusters: [{
          name: 'cluster',
          cluster: {
            server: 'server',
            'insecure-skip-tls-verify': 'insecure-skip-tls-verify',
            'certificate-authority-data': 'certificate-authority-data'
          }
        }],
        contexts: [{
          name: 'context',
          context: {
            cluster: 'cluster',
            user: 'user',
            namespace: 'namespace'
          }
        }],
        'current-context': 'context',
        users: [{
          name: 'user',
          user: {
            'client-certificate-data': 'client-certificate-data',
            'client-key-data': 'client-key-data',
            token: 'token',
            username: 'username',
            password: 'password'
          }
        }]
      }
      const kubeconfigExtensions = {
        extensions: 'extensions',
        clusters: [{
          extensions: 'extensions',
          cluster: {
            extensions: 'extensions'
          }
        }],
        contexts: [{
          extensions: 'extensions',
          context: {
            extensions: 'extensions'
          }
        }],
        users: [{
          extensions: 'extensions',
          user: {
            extensions: 'extensions'
          }
        }]
      }
      const extendedKubeconfig = merge({}, kubeconfig, kubeconfigExtensions)
      const cleanedKubeconfig = safeLoad(cleanKubeconfig(safeDump(extendedKubeconfig)))
      expect(cleanedKubeconfig).to.eql(kubeconfig)
    })
  })
})
