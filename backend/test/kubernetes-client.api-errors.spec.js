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

const { HTTPError } = require('got')

const ApiErrors = require('../lib/kubernetes-client/ApiErrors')

describe('kubernetes-client', function () {
  /* eslint no-unused-expressions: 0 */

  const sandbox = sinon.createSandbox()

  afterEach(function () {
    sandbox.restore()
  })

  describe('ApiErrors', function () {
    const { StatusError, isExpiredError, isResourceExpired, isGone } = ApiErrors
    const code = 'code'
    const message = 'message'
    const reason = 'reason'

    it('should create a StatusError instance', function () {
      const statusError = new StatusError({ code, message, reason })
      expect(statusError).to.be.an.instanceof(Error)
      expect(statusError).to.have.property('stack')
      expect(statusError.code).to.equal(code)
      expect(statusError.message).to.equal(message)
      expect(statusError.reason).to.equal(reason)
    })

    it('should check if a status error has code "Gone"', function () {
      const code = 410
      let error = new StatusError({ code })
      expect(isGone(error)).to.be.true
      expect(isExpiredError(error)).to.be.true
      error = new HTTPError({ statusCode: code })
      expect(isGone(error)).to.be.true
      expect(isExpiredError(error)).to.be.true
    })

    it('should check if a status error has reason "Expired"', function () {
      const reason = 'Expired'
      let error = new StatusError({ reason })
      expect(isResourceExpired(error)).to.be.true
      expect(isExpiredError(error)).to.be.true
      error = new HTTPError({ statusMessage: reason })
      expect(isResourceExpired(error)).to.be.true
      expect(isExpiredError(error)).to.be.true
    })

    it('should only consider StatusError or HTTPError instances', function () {
      const error = new Error()
      error.reason = 'Expired'
      expect(isExpiredError(error)).to.be.false
    })
  })
})
