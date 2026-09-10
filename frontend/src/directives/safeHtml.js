//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import DOMPurify from 'dompurify'

export const safeHtml = {
  mounted (el, { value }) {
    el.innerHTML = DOMPurify.sanitize(value ?? '')
  },
  updated (el, { value }) {
    el.innerHTML = DOMPurify.sanitize(value ?? '')
  },
}
