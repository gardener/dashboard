//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import DOMPurify from 'dompurify'

const PURIFY_CONFIG = { ADD_ATTR: ['target', 'rel'] }

export const safeHtml = {
  mounted (el, { value }) {
    el.innerHTML = DOMPurify.sanitize(value ?? '', PURIFY_CONFIG)
  },
  updated (el, { value }) {
    el.innerHTML = DOMPurify.sanitize(value ?? '', PURIFY_CONFIG)
  },
}
