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

import decode from 'jwt-decode'
import constant from 'lodash/constant'

export function clearStaleState (mgr) {
  return mgr
    .clearStaleState()
    .catch((err) => {
      console.error('clearStateState error', err.message)
    })
}

export function removeUser (mgr) {
  return mgr
    .removeUser()
    .catch((err) => {
      console.error('removeUser error', err.message)
      throw err
    })
}

export function signout (mgr) {
  return removeUser(mgr)
}

export function signin (mgr, redirectTo) {
  return mgr
    .signinRedirect({ data: { redirectTo } })
    .catch((err) => {
      console.error('signin error', err.message)
      throw err
    })
}

export function signinCallback (mgr) {
  return mgr
    .signinRedirectCallback()
    .catch((err) => {
      console.error('signinCallback error', err.message)
      throw err
    })
}

function getTokenExpirationDate (encodedToken) {
  const token = decode(encodedToken)
  if (!token.exp) {
    return null
  }
  const date = new Date(0)
  date.setUTCSeconds(token.exp)
  return date
}

export function isTokenExpired (token) {
  if (!token) {
    return true
  }
  const expirationDate = getTokenExpirationDate(token)
  return expirationDate < new Date()
}

export function isUserLoggedIn (user) {
  try {
    return user ? !isTokenExpired(user.id_token) : false
  } catch (err) { /* ignore error */ }
  return false
}

export function isLoggedIn (mgr) {
  return mgr
    .getUser()
    .then(isUserLoggedIn)
    .catch(constant(false))
}
