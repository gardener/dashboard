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

import { expect } from 'chai'
import { canI } from '@/utils'

describe('utils', function () {
  describe('authorization', function () {
    describe('#canI', function () {
      let rulesReview

      beforeEach(function () {
        rulesReview = {
          resourceRules: [{
            verbs: ['get'],
            apiGroups: ['group1'],
            resources: ['resource1']
          },
          {
            verbs: ['get'],
            apiGroups: ['group2'],
            resources: ['resource2'],
            resourceNames: [
              'resourceName2'
            ]
          },
          {
            verbs: ['get'],
            apiGroups: ['group3'],
            resources: ['resource3']
          },
          {
            verbs: ['get'],
            apiGroups: ['group3'],
            resources: ['resource3'],
            resourceNames: [
              'resourceName3',
              'resourceName4'
            ]
          }]
        }
      })

      it('should validate', function () {
        expect(canI(rulesReview, 'get', 'group1', 'resource1')).to.be.true
        expect(canI(rulesReview, 'get', 'group1', 'resource1', 'anyResourceName')).to.be.true

        expect(canI(rulesReview, 'foo', 'group1', 'resource1')).to.be.false
        expect(canI(rulesReview, 'get', 'foo', 'resource1')).to.be.false
        expect(canI(rulesReview, 'get', 'group1', 'foo')).to.be.false
        expect(canI(rulesReview, 'get', 'group1', 'resource3')).to.be.false
        expect(canI(rulesReview, 'foo', 'bar', 'baz')).to.be.false
      })

      it('should validate for resourceName', function () {
        expect(canI(rulesReview, 'get', 'group2', 'resource2', 'resourceName2')).to.be.true
        expect(canI(rulesReview, 'get', 'group3', 'resource3')).to.be.true
        expect(canI(rulesReview, 'get', 'group3', 'resource3', 'resourceName3')).to.be.true
        expect(canI(rulesReview, 'get', 'group3', 'resource3', 'resourceName4')).to.be.true
        expect(canI(rulesReview, 'get', 'group3', 'resource3', 'anyResourceName')).to.be.true

        expect(canI(rulesReview, 'get', 'group2', 'resource2')).to.be.false
        expect(canI(rulesReview, 'get', 'group2', 'resource2', 'foo')).to.be.false
        expect(canI(rulesReview, 'foo', 'group2', 'resource2', 'resourceName2')).to.be.false
        expect(canI(rulesReview, 'get', 'foo', 'resource2', 'resourceName2')).to.be.false
        expect(canI(rulesReview, 'get', 'group2', 'foo', 'resourceName2')).to.be.false
        expect(canI(rulesReview, 'foo', 'bar', 'baz', 'resourceName2')).to.be.false
      })

      it('should validate with wildcard verb', function () {
        rulesReview = {
          resourceRules: [{
            verbs: ['*'],
            apiGroups: ['group4'],
            resources: ['resource4']
          }]
        }
        expect(canI(rulesReview, 'get', 'group4', 'resource4')).to.be.true
        expect(canI(rulesReview, 'list', 'group4', 'resource4')).to.be.true
        expect(canI(rulesReview, 'foo', 'group4', 'resource4')).to.be.true
        expect(canI(rulesReview, '*', 'group4', 'resource4')).to.be.true
        expect(canI(rulesReview, 'get', 'group4', 'resource4', 'anyResourceName')).to.be.true

        expect(canI(rulesReview, 'get', 'foo', 'resource4')).to.be.false
        expect(canI(rulesReview, 'get', 'group4', 'foo')).to.be.false
      })

      it('should validate with wildcard apiGroup', function () {
        rulesReview = {
          resourceRules: [{
            verbs: ['get'],
            apiGroups: ['*'],
            resources: ['resource4']
          }]
        }
        expect(canI(rulesReview, 'get', 'group4', 'resource4')).to.be.true
        expect(canI(rulesReview, 'get', 'foo', 'resource4')).to.be.true
        expect(canI(rulesReview, 'get', '*', 'resource4')).to.be.true
        expect(canI(rulesReview, 'get', 'group4', 'resource4', 'anyResourceName')).to.be.true

        expect(canI(rulesReview, 'foo', 'group4', 'resource4')).to.be.false
        expect(canI(rulesReview, 'get', 'group4', 'foo')).to.be.false
      })

      it('should validate with wildcard resource', function () {
        rulesReview = {
          resourceRules: [{
            verbs: ['get'],
            apiGroups: ['group4'],
            resources: ['*']
          }]
        }
        expect(canI(rulesReview, 'get', 'group4', 'resource4')).to.be.true
        expect(canI(rulesReview, 'get', 'group4', 'foo')).to.be.true
        expect(canI(rulesReview, 'get', 'group4', '*')).to.be.true
        expect(canI(rulesReview, 'get', 'group4', 'resource4', 'anyResourceName')).to.be.true

        expect(canI(rulesReview, 'foo', 'group4', 'resource4')).to.be.false
        expect(canI(rulesReview, 'get', 'foo', 'resource4')).to.be.false
      })

      it('should validate with wildcard resource name', function () {
        rulesReview = {
          resourceRules: [{
            verbs: ['get'],
            apiGroups: ['group4'],
            resources: ['resource4'],
            resourceName: ['*']
          }]
        }
        expect(canI(rulesReview, 'get', 'group4', 'resource4')).to.be.true
        expect(canI(rulesReview, 'get', 'group4', 'resource4', 'anyResourceName')).to.be.true

        expect(canI(rulesReview, 'foo', 'group4', 'resource4')).to.be.false
        expect(canI(rulesReview, 'get', 'foo', 'resource4')).to.be.false
        expect(canI(rulesReview, 'get', 'group4', 'foo')).to.be.false
      })

      it('should not fail to validate rulesReview', function () {
        expect(canI(undefined, 'get', 'group1', 'resource1')).to.be.false
        expect(canI({}, 'get', 'group1', 'resource1')).to.be.false
        expect(canI({ resourceRules: [] }, 'get', 'group1', 'resource1')).to.be.false
        expect(canI({
          resourceRules: [{
            verbs: [],
            apiGroups: [],
            resources: []
          }]
        }, 'get', 'group1', 'resource1')).to.be.false
      })
    })
  })
})
