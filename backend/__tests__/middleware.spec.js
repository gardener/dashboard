//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  describe,
  expect,
  it,
} from 'vitest'

import { ErrorTemplate } from '../lib/middleware.js'

describe('middleware', () => {
  describe('ErrorTemplate', () => {
    it('renders escaped error values and an optional stack trace', () => {
      const html = ErrorTemplate({
        reason: '<Reason>',
        message: '<script>alert("message")</script>',
        code: 500,
        details: {
          stack: 'Error <stack>',
        },
      })

      expect(html).toContain('<title>&lt;Reason&gt; &middot; Gardener</title>')
      expect(html).toContain('<h1>&lt;script&gt;alert(&quot;message&quot;)&lt;/script&gt;</h1>')
      expect(html).toContain('<h2>500</h2>')
      expect(html).toContain('<pre>Error &lt;stack&gt;</pre>')
      expect(html).not.toContain('<script>alert("message")</script>')
    })

    it('omits the stack trace when it is not present', () => {
      const html = ErrorTemplate({
        reason: 'Not Found',
        message: 'Missing',
        code: 404,
        details: {},
      })

      expect(html).not.toContain('<pre>')
    })
  })
})
