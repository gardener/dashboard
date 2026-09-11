//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkGithub from 'remark-github'
import remarkBreaks from 'remark-breaks'
import remarkEmoji from 'remark-emoji'
import remarkRehype from 'remark-rehype'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeStringify from 'rehype-stringify'
import sanitizeHtml from 'sanitize-html'
const SANITIZE = {
  allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'details', 'summary'],
  transformTags: {
    a (tagName, attribs) {
      // eslint-disable-next-line no-control-regex -- intentional: strip control chars and whitespace before scheme check
      const href = attribs.href?.replace(/[\u0000-\u0020\u007f]/g, '')
      if (href?.toLowerCase().startsWith('mailto:')) {
        const url = new URL(href)
        attribs.href = `mailto:${url.pathname}`
      }
      return { tagName, attribs }
    },
  },
}

function buildProcessor ({ github } = {}) {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkGithub, github ?? {})
    .use(remarkBreaks)
    .use(remarkEmoji, { emoticon: false })
  // Keep raw HTML as raw nodes, required too keep some tags like details/summary
  // Unsafe HTML will be sanitized later
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] })
  // emit raw nodes as HTML (unsafe until sanitized)
    .use(rehypeStringify, { allowDangerousHtml: true })
}

export function createConverter (options = {}) {
  const processor = buildProcessor(options)
  return {
    async makeSanitizedHtml (text) {
      const file = await processor.process(text)
      const rawHtml = String(file)
      return sanitizeHtml(rawHtml, SANITIZE).trim()
    },
  }
}
