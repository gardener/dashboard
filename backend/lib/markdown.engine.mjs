//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkEmoji from 'remark-emoji'
import remarkRehype from 'remark-rehype'
import rehypeSlug from 'rehype-slug'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeStringify from 'rehype-stringify'
import sanitizeHtml from 'sanitize-html'

const SANITIZE = {
  allowedTags: [
    ...sanitizeHtml.defaults.allowedTags,

    // Allowed tags in GitHub-flavored markdown
    'details', 'summary',
    'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'del',
    'input',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'pre', 'code',
    'hr',
  ],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,

    // Links
    a: [...(sanitizeHtml.defaults.allowedAttributes.a || []), 'target', 'rel', 'title'],

    // Images
    img: ['src', 'alt', 'title', 'width', 'height'],

    // Details widget
    details: ['open'],

    // Tables
    th: ['align'],
    td: ['align'],

    // Slugs from rehype-slug
    h1: ['id'],
    h2: ['id'],
    h3: ['id'],
    h4: ['id'],
    h5: ['id'],
    h6: ['id'],

    // Task list checkboxes
    input: ['type', 'checked', 'disabled'],

    // Code highlighting classes if you ever add a highlighter later:
    code: ['class'],
    pre: ['class'],
  },

  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: {
    img: ['http', 'https', 'data'],
  },

  // As we allow input and a tags ensure we transform them to safe variants
  transformTags: {
    a: (tagName, attribs) => {
      // Keep existing href/title, force safe link behavior when target=_blank
      const target = attribs.target || '_blank'
      const rel = new Set((attribs.rel || '').split(/\s+/).filter(Boolean))
      rel.add('noopener')
      rel.add('noreferrer')
      return { tagName, attribs: { ...attribs, target, rel: Array.from(rel).join(' ') } }
    },

    input: (tagName, attribs) => {
      // Only allow disabled checkboxes (GitHub-style task lists)
      const isCheckbox = (attribs.type || '').toLowerCase() === 'checkbox'
      if (!isCheckbox) {
        return { tagName: 'span', text: '' } // drop other inputs
      }
      return {
        tagName,
        attribs: {
          type: 'checkbox',
          disabled: 'disabled',
          ...(attribs.checked != null ? { checked: 'checked' } : {}),
        },
      }
    },
  },
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkBreaks)
  .use(remarkEmoji, { emoticon: false })

  // Keep raw HTML as raw nodes (do NOT parse it into the tree)
  .use(remarkRehype, { allowDangerousHtml: true })

  .use(rehypeSlug)
  .use(rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] })

  // emit raw nodes as HTML (unsafe until sanitized)
  .use(rehypeStringify, { allowDangerousHtml: true })

function breakAfterInlineHtmlBlock (input) {
  if (typeof input !== 'string') {
    return ''
  }

  // Tags that can trigger HTML-block parsing / swallowing when content follows right after them.
  // Includes your allowed tags + a few common HTML-block starters that users may paste.
  const tagAlternation =
    '(details|summary|table|thead|tbody|tfoot|tr|th|td|pre|code|blockquote|h[1-6]|p|ul|ol|li|script|style|textarea)'

  // Replace any whitespace (including newlines) after a closing tag with "\n\n"
  // *only if* something non-whitespace follows.
  const re = new RegExp(`</${tagAlternation}>[\\s\\u00A0]+(?=\\S)`, 'gi')

  return input.replace(re, (m) => {
    // Keep the exact closing tag (case-insensitive match), then force a paragraph break
    const closingTag = m.match(/<\/[^>]+>/)?.[0] ?? m
    return `${closingTag}\n\n`
  })
}

export function createConverter () {
  return {
    async makeSanitizedHtml (text) {
      const normalized = breakAfterInlineHtmlBlock(text)
      const file = await processor.process(normalized)
      const rawHtml = String(file)
      // Sanitize the generated HTML
      return sanitizeHtml(rawHtml, SANITIZE).trim()
    },
  }
}
