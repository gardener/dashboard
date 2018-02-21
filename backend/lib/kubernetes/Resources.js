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

module.exports = {
  Namespace: {
    name: 'namespaces',
    kind: 'Namespace',
    apiVersion: 'v1'
  },
  Secret: {
    name: 'secrets',
    kind: 'Secret',
    apiVersion: 'v1'
  },
  CloudProfile: {
    name: 'cloudprofiles',
    kind: 'CloudProfile',
    apiVersion: 'garden.sapcloud.io/v1beta1'
  },
  PrivateSecretBinding: {
    name: 'privatesecretbindings',
    kind: 'PrivateSecretBinding',
    apiVersion: 'garden.sapcloud.io/v1beta1'
  },
  CrossSecretBinding: {
    name: 'crosssecretbindings',
    kind: 'CrossSecretBinding',
    apiVersion: 'garden.sapcloud.io/v1beta1'
  },
  RoleBinding: {
    name: 'rolebindings',
    kind: 'RoleBinding',
    apiVersion: 'rbac.authorization.k8s.io/v1beta1'
  },
  ClusterRoleBinding: {
    name: 'clusterrolebindings',
    kind: 'ClusterRoleBinding',
    apiVersion: 'rbac.authorization.k8s.io/v1beta1'
  },
  ClusterRole: {
    name: 'clusterroles',
    kind: 'ClusterRole',
    apiVersion: 'rbac.authorization.k8s.io/v1beta1'
  },
  ThirdPartyResource: {
    name: 'thirdpartyresources',
    kind: 'ThirdPartyResource',
    apiVersion: 'extensions/v1beta1'
  },
  CustomResourceDefinition: {
    name: 'customresourcedefinitions',
    kind: 'CustomResourceDefinition',
    apiVersion: 'apiextensions.k8s.io/v1beta1'
  },
  Shoot: {
    name: 'shoots',
    kind: 'Shoot',
    apiVersion: 'garden.sapcloud.io/v1beta1'
  },
  Seed: {
    name: 'seeds',
    kind: 'Seed',
    apiVersion: 'garden.sapcloud.io/v1beta1'
  }
}
