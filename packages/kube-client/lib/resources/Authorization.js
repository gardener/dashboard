//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { mix } from 'mixwith'
import { Authorization } from '../groups.js'
import { ClusterScoped, Creatable } from '../mixins.js'

class SelfSubjectAccessReview extends mix(Authorization).with(ClusterScoped, Creatable) {
  static get names () {
    return {
      plural: 'selfsubjectaccessreviews',
      singular: 'selfsubjectaccessreview',
      kind: 'SelfSubjectAccessReview',
    }
  }
}

class SelfSubjectRulesReview extends mix(Authorization).with(ClusterScoped, Creatable) {
  static get names () {
    return {
      plural: 'selfsubjectrulesreviews',
      singular: 'selfsubjectrulesreview',
      kind: 'SelfSubjectRulesReview',
    }
  }
}

class SubjectAccessReview extends mix(Authorization).with(ClusterScoped, Creatable) {
  static get names () {
    return {
      plural: 'subjectaccessreviews',
      singular: 'subjectaccessreview',
      kind: 'SubjectAccessReview',
    }
  }
}

export default {
  SelfSubjectAccessReview,
  SelfSubjectRulesReview,
  SubjectAccessReview,
}
