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

const ExtendableError = require('es6-error')

function createSymbol (name) {
  return Symbol(name)
}

const descriptionSymbol = createSymbol('description')

class BaseError extends ExtendableError {
  get description () {
    return this[descriptionSymbol] || this.message
  }

  set description (description) {
    this[descriptionSymbol] = description
  }
}
exports.BaseError = BaseError

class ContinueWithNext extends BaseError {
  constructor () {
    super('Continue with next handler')
  }
}
exports.ContinueWithNext = ContinueWithNext

class Timeout extends BaseError {
  constructor (message, error) {
    super(message)
    if (error instanceof Error) {
      this.error = error
    } else if (typeof error === 'string') {
      this.error = new Error(error)
    }
  }
  static timedOut (time, err) {
    return new Timeout(`Operation timed out after ${time} ms`, err)
  }
  static toManyAttempts (attempts, err) {
    return new Timeout(`Operation failed after ${attempts} attempts`, err)
  }
}
exports.Timeout = Timeout

class HttpError extends BaseError {
  constructor (code, reason, message) {
    super(message)
    this.code = code
    this.reason = reason
  }
}
exports.HttpError = HttpError

class KubernetesError extends HttpError {
  constructor (kubernetesStatus) {
    super(kubernetesStatus.code, kubernetesStatus.reason, kubernetesStatus.message)
    this.status = kubernetesStatus.status
    this.details = kubernetesStatus.details
  }
}
exports.KubernetesError = KubernetesError

class HttpClientError extends HttpError {}
exports.HttpClientError = HttpClientError

class BadRequest extends HttpClientError {
  constructor (message) {
    super(400, 'Bad Request', message)
  }
}
exports.BadRequest = BadRequest

class Unauthorized extends HttpClientError {
  constructor (message) {
    super(401, 'Unauthorized', message || 'The request requires user authentication')
  }
}
exports.Unauthorized = Unauthorized

class Forbidden extends HttpClientError {
  constructor (message) {
    super(403, 'Forbidden', message)
  }
}
exports.Forbidden = Forbidden

class JwtError extends Forbidden {
  constructor (unauthorizedError) {
    super(unauthorizedError.message)
    this.errorCode = unauthorizedError.code
  }
}
exports.JwtError = JwtError

class NotFound extends HttpClientError {
  constructor (message) {
    super(404, 'Not Found', message)
  }
}
exports.NotFound = NotFound

class MethodNotAllowed extends HttpClientError {
  constructor (method, allow) {
    let message = `The method ${method} is not allowed for the resource identified by the URI`
    super(405, 'Method Not Allowed', message)
    this.allow = allow
  }
}
exports.MethodNotAllowed = MethodNotAllowed

class NotAcceptable extends HttpClientError {
  constructor (message) {
    super(406, 'Not Acceptable', message)
  }
}
exports.NotAcceptable = NotAcceptable

class Conflict extends HttpClientError {
  constructor (message) {
    super(409, 'Conflict', message)
  }
}
exports.Conflict = Conflict

class Gone extends HttpClientError {
  constructor (message) {
    super(410, 'Gone', message)
  }
}
exports.Gone = Gone

class PreconditionFailed extends HttpClientError {
  constructor (message) {
    super(412, 'Precondition Failed', message)
  }
}
exports.PreconditionFailed = PreconditionFailed

class UnsupportedMediaType extends HttpClientError {
  constructor (message) {
    super(415, 'Unsupported Media Type', message)
  }
}
exports.UnsupportedMediaType = UnsupportedMediaType

class UnprocessableEntity extends HttpClientError {
  constructor (message) {
    super(422, 'Unprocessable Entity', message)
  }
}
exports.UnprocessableEntity = UnprocessableEntity

class HttpServerError extends HttpError {}
exports.HttpServerError = HttpServerError

class InternalServerError extends HttpServerError {
  constructor (message) {
    super(500, 'Internal Server Error', message)
  }
}
exports.InternalServerError = InternalServerError

class NotImplemented extends HttpServerError {
  constructor (message) {
    super(501, 'Not Implemented', message)
  }
}
exports.NotImplemented = NotImplemented

class BadGateway extends HttpServerError {
  constructor (message) {
    super(502, 'Bad Gateway', message)
  }
}
exports.BadGateway = BadGateway

class ServiceUnavailable extends HttpServerError {
  constructor (message) {
    super(503, 'Service Unavailable', message)
  }
}
exports.ServiceUnavailable = ServiceUnavailable

class GatewayTimeout extends HttpServerError {
  constructor (message) {
    super(504, 'Gateway Timeout', message)
  }
}
exports.GatewayTimeout = GatewayTimeout
