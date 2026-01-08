//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
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
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkGithub)   // ← add this
  .use(remarkBreaks)
  .use(remarkEmoji, { emoticon: false })

  // Keep raw HTML as raw nodes (do NOT parse it into the tree)
  .use(remarkRehype, { allowDangerousHtml: true })

  .use(rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] })

  // emit raw nodes as HTML (unsafe until sanitized)
  .use(rehypeStringify, { allowDangerousHtml: true })

export function createConverter () {
  return {
    async makeSanitizedHtml (text) {
      const file = await processor.process(text)
      const rawHtml = String(file)
      // Sanitize the generated HTML
      return sanitizeHtml(rawHtml, SANITIZE).trim()
    },
  }
}
