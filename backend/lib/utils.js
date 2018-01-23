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

const path = require('path')
const express = require('express')
const { isProd } = require('./config')

exports.resolve = resolve
exports.serveStatic = serveStatic

function resolve (pathname) {
  return path.resolve(__dirname, '..', pathname)
}

function serveStatic (pathname, cache) {
  const maxAge = cache && isProd ? 60 * 60 * 24 * 30 : 0
  return express.static(resolve(pathname), {
    maxAge
  })
}
