//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { Converter } = require('showdown')
const sanitizeHtml = require('sanitize-html')

function createConverter (options) {
  const converter = new Converter({
    tables: true,
    parseImgDimensions: true,
    ghCodeBlocks: true,
    ghCompatibleHeaderId: true,
    tasklists: true,
    openLinksInNewWindow: true,
    emoji: true,
    simplifiedAutoLink: true,
    simpleLineBreaks: true,
    ...options,
  })

  return {
    makeSanitizedHtml (text, options) {
      return sanitizeHtml(converter.makeHtml(text), {
        allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'details', 'summary'],
        ...options,
      })
    },
  }
}

module.exports = {
  createConverter,
}
