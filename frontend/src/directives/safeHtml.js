//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import DOMPurify from 'dompurify'

const BASE_CONFIG = {
  ADD_ATTR: ['target', 'rel', 'style'],
  FORBID_TAGS: ['style'],
}

const STYLE_TAGS_CONFIG = {
  ...BASE_CONFIG,
  ADD_TAGS: ['style'],
  FORBID_TAGS: [],
  FORCE_BODY: true,
}

// usage: either with plain HTML string (i.e. v-safe-html="myElement")
// or with an object containing HTML and an optional allowStyleTags flag (i.e. v-safe-html="{ html: myElement, allowStyleTags: true }")
export const safeHtml = (htmlElement, { value }) => {
  if (typeof value === 'string') {
    htmlElement.innerHTML = DOMPurify.sanitize(value, BASE_CONFIG)
  } else {
    const config = value?.allowStyleTags ? STYLE_TAGS_CONFIG : BASE_CONFIG
    htmlElement.innerHTML = DOMPurify.sanitize(value?.html ?? '', config)
  }
}
