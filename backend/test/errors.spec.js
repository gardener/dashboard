//
// Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

const {
  BaseError,
  ContinueWithNext,
  Timeout,
  HttpError,
  KubernetesError,
  HttpClientError,
  BadRequest,
  Unauthorized,
  Forbidden,
  JwtError,
  NotFound,
  MethodNotAllowed,
  NotAcceptable,
  Conflict,
  Gone,
  PreconditionFailed,
  UnprocessableEntity,
  HttpServerError,
  InternalServerError,
  NotImplemented,
  BadGateway,
  ServiceUnavailable
} = require('../lib/errors')

describe('errors', function () {
  /* eslint no-unused-expressions: 0 */
  const message = 'message'

  describe('BaseError', function () {
    const description = 'description'

    it('should create a BaseError instance', function () {
      const err = new BaseError(message)
      expect(err).to.be.instanceof(Error)
      expect(err).to.be.instanceof(BaseError)
      expect(err.message).to.equal(message)
      expect(err).to.have.property('name').that.is.equal('BaseError')
    })

    it('should have an error description which defaults to error message', function () {
      const err = new BaseError(message)
      expect(err.description).to.equal(message)
      err.description = description
      expect(err.description).to.equal(description)
    })
  })

  describe('ContinueWithNext', function () {
    const message = 'Continue with next handler'

    it('should create a ContinueWithNext instance', function () {
      const err = new ContinueWithNext()
      expect(err).to.be.instanceof(Error)
      expect(err).to.be.instanceof(BaseError)
      expect(err).to.be.instanceof(ContinueWithNext)
      expect(err.message).to.equal(message)
      expect(err).to.have.property('name').that.is.equal('ContinueWithNext')
    })
  })

  describe('Timeout', function () {
    const innerError = new Error('inner error')

    it('should create a Timeout instance', function () {
      const err = new Timeout(message)
      expect(err).to.be.instanceof(Error)
      expect(err).to.be.instanceof(BaseError)
      expect(err).to.be.instanceof(Timeout)
      expect(err.message).to.equal(message)
      expect(err).to.have.property('name').that.is.equal('Timeout')
      expect(err).not.to.have.property('error')
    })

    it('should create a Timeout instance with inner error', function () {
      const err = new Timeout(message, innerError)
      expect(err).to.have.property('error').that.is.equal(innerError)
    })

    it('should create a Timeout instance with inner error message', function () {
      const err = new Timeout(message, innerError.message)
      expect(err).to.have.nested.property('error.message').that.is.equal(innerError.message)
    })

    it('should create a Timeout instance because it "timed out"', function () {
      const time = 42
      const err = Timeout.timedOut(time, innerError)
      expect(err.message).to.include(`after ${time} ms`)
      expect(err).to.have.property('error').that.is.equal(innerError)
    })

    it('should create a Timeout instance because of "to many attempts"', function () {
      const attempts = 42
      const err = Timeout.toManyAttempts(attempts, innerError)
      expect(err.message).to.include(`after ${attempts} attempts`)
      expect(err).to.have.property('error').that.is.equal(innerError)
    })
  })

  describe('HttpError', function () {
    const code = 0x636f6465
    const reason = 'reason'

    it('should create a HttpError instance', function () {
      const err = new HttpError(code, reason, message)
      expect(err).to.be.instanceof(Error)
      expect(err).to.be.instanceof(BaseError)
      expect(err).to.be.instanceof(HttpError)
      expect(err.message).to.equal(message)
      expect(err).to.have.property('name').that.is.equal('HttpError')
      expect(err).to.have.property('code').that.is.equal(code)
      expect(err).to.have.property('reason').that.is.equal(reason)
    })
  })

  describe('KubernetesError', function () {
    const code = 0x636f6465
    const reason = 'reason'
    const status = 'status'
    const details = {}
    const kubernetesStatus = {code, reason, message, status, details}

    it('should create a KubernetesError instance', function () {
      const err = new KubernetesError(kubernetesStatus)
      expect(err).to.be.instanceof(HttpError)
      expect(err).to.be.instanceof(KubernetesError)
      expect(err.message).to.equal(message)
      expect(err.name).to.equal('KubernetesError')
      expect(err.code).to.equal(code)
      expect(err.reason).to.equal(reason)
      expect(err).to.have.property('status').that.is.equal(status)
      expect(err).to.have.property('details').that.is.equal(details)
    })
  })

  describe('HttpClientError', function () {
    const code = 0x636f6465
    const reason = 'reason'

    it('should create a HttpClientError instance', function () {
      const err = new HttpClientError(code, reason, message)
      expect(err).to.be.instanceof(HttpError)
      expect(err).to.be.instanceof(HttpClientError)
      expect(err.message).to.equal(message)
      expect(err.name).to.equal('HttpClientError')
      expect(err.code).to.equal(code)
      expect(err.reason).to.equal(reason)
    })
  })

  describe('BadRequest', function () {
    const code = 400
    const reason = 'Bad Request'

    it('should create a BadRequest instance', function () {
      const err = new BadRequest(message)
      expect(err).to.be.instanceof(HttpClientError)
      expect(err).to.be.instanceof(BadRequest)
      expect(err.message).to.equal(message)
      expect(err.name).to.equal('BadRequest')
      expect(err.code).to.equal(code)
      expect(err.reason).to.equal(reason)
    })
  })

  describe('Unauthorized', function () {
    const code = 401
    const reason = 'Unauthorized'

    it('should create a Unauthorized instance', function () {
      const err = new Unauthorized(message)
      expect(err).to.be.instanceof(HttpClientError)
      expect(err).to.be.instanceof(Unauthorized)
      expect(err.message).to.equal(message)
      expect(err.name).to.equal('Unauthorized')
      expect(err.code).to.equal(code)
      expect(err.reason).to.equal(reason)
    })

    it('should create a Unauthorized instance with default message', function () {
      const err = new Unauthorized()
      expect(err.message).to.include('requires user authentication')
    })
  })

  describe('Forbidden', function () {
    const code = 403
    const reason = 'Forbidden'

    it('should create a Forbidden instance', function () {
      const err = new Forbidden(message)
      expect(err).to.be.instanceof(HttpClientError)
      expect(err).to.be.instanceof(Forbidden)
      expect(err.message).to.equal(message)
      expect(err.name).to.equal('Forbidden')
      expect(err.code).to.equal(code)
      expect(err.reason).to.equal(reason)
    })
  })

  describe('JwtError', function () {
    const code = 403
    const reason = 'Forbidden'

    it('should create a JwtError instance', function () {
      const unauthorizedError = new Error('unauthorized error')
      unauthorizedError.code = 401
      const err = new JwtError(unauthorizedError)
      expect(err).to.be.instanceof(Forbidden)
      expect(err).to.be.instanceof(JwtError)
      expect(err.message).to.equal(unauthorizedError.message)
      expect(err.name).to.equal('JwtError')
      expect(err.code).to.equal(code)
      expect(err.reason).to.equal(reason)
      expect(err).to.have.property('errorCode').that.is.equal(unauthorizedError.code)
    })
  })

  describe('NotFound', function () {
    const code = 404
    const reason = 'Not Found'

    it('should create a NotFound instance', function () {
      const err = new NotFound(message)
      expect(err).to.be.instanceof(HttpClientError)
      expect(err).to.be.instanceof(NotFound)
      expect(err.message).to.equal(message)
      expect(err.name).to.equal('NotFound')
      expect(err.code).to.equal(code)
      expect(err.reason).to.equal(reason)
    })
  })

  describe('MethodNotAllowed', function () {
    const code = 405
    const reason = 'Method Not Allowed'

    it('should create a MethodNotAllowed instance', function () {
      const method = 'a HTTP verb'
      const allow = ['another HTTP verb']
      const err = new MethodNotAllowed(method, allow)
      expect(err).to.be.instanceof(HttpClientError)
      expect(err).to.be.instanceof(MethodNotAllowed)
      expect(err.message).to.include(`method ${method} is not allowed`)
      expect(err.name).to.equal('MethodNotAllowed')
      expect(err.code).to.equal(code)
      expect(err.reason).to.equal(reason)
      expect(err).to.have.property('allow').that.is.eql(allow)
    })
  })

  describe('NotAcceptable', function () {
    const code = 406
    const reason = 'Not Acceptable'

    it('should create a NotAcceptable instance', function () {
      const err = new NotAcceptable(message)
      expect(err).to.be.instanceof(HttpClientError)
      expect(err).to.be.instanceof(NotAcceptable)
      expect(err.message).to.equal(message)
      expect(err.name).to.equal('NotAcceptable')
      expect(err.code).to.equal(code)
      expect(err.reason).to.equal(reason)
    })
  })

  describe('Conflict', function () {
    const code = 409
    const reason = 'Conflict'

    it('should create a Conflict instance', function () {
      const err = new Conflict(message)
      expect(err).to.be.instanceof(HttpClientError)
      expect(err).to.be.instanceof(Conflict)
      expect(err.message).to.equal(message)
      expect(err.name).to.equal('Conflict')
      expect(err.code).to.equal(code)
      expect(err.reason).to.equal(reason)
    })
  })

  describe('Gone', function () {
    const code = 410
    const reason = 'Gone'

    it('should create a Gone instance', function () {
      const err = new Gone(message)
      expect(err).to.be.instanceof(HttpClientError)
      expect(err).to.be.instanceof(Gone)
      expect(err.message).to.equal(message)
      expect(err.name).to.equal('Gone')
      expect(err.code).to.equal(code)
      expect(err.reason).to.equal(reason)
    })
  })

  describe('PreconditionFailed', function () {
    const code = 412
    const reason = 'Precondition Failed'

    it('should create a PreconditionFailed instance', function () {
      const err = new PreconditionFailed(message)
      expect(err).to.be.instanceof(HttpClientError)
      expect(err).to.be.instanceof(PreconditionFailed)
      expect(err.message).to.equal(message)
      expect(err.name).to.equal('PreconditionFailed')
      expect(err.code).to.equal(code)
      expect(err.reason).to.equal(reason)
    })
  })

  describe('UnprocessableEntity', function () {
    const code = 422
    const reason = 'Unprocessable Entity'

    it('should create a UnprocessableEntity instance', function () {
      const err = new UnprocessableEntity(message)
      expect(err).to.be.instanceof(HttpClientError)
      expect(err).to.be.instanceof(UnprocessableEntity)
      expect(err.message).to.equal(message)
      expect(err.name).to.equal('UnprocessableEntity')
      expect(err.code).to.equal(code)
      expect(err.reason).to.equal(reason)
    })
  })

  describe('HttpServerError', function () {
    const code = 0x636f6465
    const reason = 'reason'

    it('should create a HttpServerError instance', function () {
      const err = new HttpServerError(code, reason, message)
      expect(err).to.be.instanceof(HttpError)
      expect(err).to.be.instanceof(HttpServerError)
      expect(err.message).to.equal(message)
      expect(err.name).to.equal('HttpServerError')
      expect(err.code).to.equal(code)
      expect(err.reason).to.equal(reason)
    })
  })

  describe('InternalServerError', function () {
    const code = 500
    const reason = 'Internal Server Error'

    it('should create a InternalServerError instance', function () {
      const err = new InternalServerError(message)
      expect(err).to.be.instanceof(HttpServerError)
      expect(err).to.be.instanceof(InternalServerError)
      expect(err.message).to.equal(message)
      expect(err.name).to.equal('InternalServerError')
      expect(err.code).to.equal(code)
      expect(err.reason).to.equal(reason)
    })
  })

  describe('NotImplemented', function () {
    const code = 501
    const reason = 'Not Implemented'

    it('should create a NotImplemented instance', function () {
      const err = new NotImplemented(message)
      expect(err).to.be.instanceof(HttpServerError)
      expect(err).to.be.instanceof(NotImplemented)
      expect(err.message).to.equal(message)
      expect(err.name).to.equal('NotImplemented')
      expect(err.code).to.equal(code)
      expect(err.reason).to.equal(reason)
    })
  })

  describe('BadGateway', function () {
    const code = 502
    const reason = 'Bad Gateway'

    it('should create a BadGateway instance', function () {
      const err = new BadGateway(message)
      expect(err).to.be.instanceof(HttpServerError)
      expect(err).to.be.instanceof(BadGateway)
      expect(err.message).to.equal(message)
      expect(err.name).to.equal('BadGateway')
      expect(err.code).to.equal(code)
      expect(err.reason).to.equal(reason)
    })
  })

  describe('ServiceUnavailable', function () {
    const code = 503
    const reason = 'Service Unavailable'

    it('should create a ServiceUnavailable instance', function () {
      const err = new ServiceUnavailable(message)
      expect(err).to.be.instanceof(HttpServerError)
      expect(err).to.be.instanceof(ServiceUnavailable)
      expect(err.message).to.equal(message)
      expect(err.name).to.equal('ServiceUnavailable')
      expect(err.code).to.equal(code)
      expect(err.reason).to.equal(reason)
    })
  })
})
