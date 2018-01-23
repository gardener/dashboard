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

export function isConflict (error) {
  return hasStatusCodeAndIsKubernetesError(409, error)
}

export function isNotFound (error) {
  return hasStatusCodeAndIsKubernetesError(404, error)
}

function hasStatusCodeAndIsKubernetesError (statusCode, error) {
  const response = error.response || {}
  if (response.status === statusCode && isKubernetesError(error)) {
    return true
  } else {
    return false
  }
}

function isKubernetesError (error) {
  const response = error.response || {}
  const status = response.data || {}
  const statusError = status.error || {}
  if (statusError.name === 'KubernetesError') {
    return true
  } else {
    return false
  }
}
