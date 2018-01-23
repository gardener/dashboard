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

const seed = require('./seed')
const project = require('./project')
const members = require('./members')
const infrastructureSecret = require('./infrastructureSecret')

// seeds
exports.seed = exports.seeds = seed
exports.mapSecretToSeed = seed.fromResource

// project
exports.project = exports.projects = project
exports.mapProjectToNamespace = project.toResource
exports.mapNamespaceToProject = project.fromResource

// members
exports.member = exports.members = members
exports.mapRoleBindingToMembers = members.fromResource

// infrastructure secrets
exports.infrastructureSecret = exports.infrastructureSecrets = infrastructureSecret
exports.mapInfrastructureSecretToSecret = infrastructureSecret.toResource
exports.mapSecretToInfrastructureSecret = infrastructureSecret.fromResource
