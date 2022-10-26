//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { mix } = require('mixwith')

const { Authorization } = require('../groups')
const { ClusterScoped, Creatable } = require('../mixins')

class SelfSubjectAccessReview extends mix(Authorization).with(ClusterScoped, Creatable) {
  static get names () {
    return {
      plural: 'selfsubjectaccessreviews',
      singular: 'selfsubjectaccessreview',
      kind: 'SelfSubjectAccessReview'
    }
  }
}

class SelfSubjectRulesReview extends mix(Authorization).with(ClusterScoped, Creatable) {
  static get names () {
    return {
      plural: 'selfsubjectrulesreviews',
      singular: 'selfsubjectrulesreview',
      kind: 'SelfSubjectRulesReview'
    }
  }
}

class SubjectAccessReview extends mix(Authorization).with(ClusterScoped, Creatable) {
  static get names () {
    return {
      plural: 'subjectaccessreviews',
      singular: 'subjectaccessreview',
      kind: 'SubjectAccessReview'
    }
  }
}

module.exports = {
  SelfSubjectAccessReview,
  SelfSubjectRulesReview,
  SubjectAccessReview
}
