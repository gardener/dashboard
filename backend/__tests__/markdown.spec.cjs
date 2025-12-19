//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const markdown = require('../dist/lib/markdown')

function render (md, sanitizeOptions) {
  const { makeSanitizedHtml } = markdown.createConverter()
  // normalize a tiny bit for stable snapshots across OSes
  return makeSanitizedHtml(md, sanitizeOptions).replace(/\r\n/g, '\n').trim()
}

describe('createConverter().makeSanitizedHtml', () => {
  test('basic markdown: emphasis, strong, links, line breaks', () => {
    const md = [
      'Hello *world* and **friends**.',
      '',
      'A link: https://example.com',
      '',
      'Line 1',
      'Line 2 (should be a simple line break with `simpleLineBreaks`).',
    ].join('\n')

    expect(render(md)).toMatchSnapshot()
  })

  test('GitHub-style fenced code blocks (ghCodeBlocks)', () => {
    const md = [
      '```js',
      'const x = 1',
      'console.log(x)',
      '```',
      '',
      'Indented code:',
      '',
      '    let y = 2',
    ].join('\n')

    expect(render(md)).toMatchSnapshot()
  })

  test('GFM tables (tables)', () => {
    const md = [
      '| col A | col B |',
      '| --- | ---: |',
      '| left |  123 |',
      '| wow  |    4 |',
    ].join('\n')

    expect(render(md)).toMatchSnapshot()
  })

  test('Task lists (tasklists)', () => {
    const md = [
      '- [ ] todo',
      '- [x] done',
      '  - [ ] nested',
    ].join('\n')

    expect(render(md)).toMatchSnapshot()
  })

  test('Heading IDs (ghCompatibleHeaderId)', () => {
    const md = [
      '# Hello World',
      '## Hello World', // same text twice, show how IDs are generated
      '### Ümlaut & Symbols!',
    ].join('\n')

    expect(render(md)).toMatchSnapshot()
  })

  test('Emoji (emoji)', () => {
    const md = 'Ship it :rocket: and smile :smile:'
    expect(render(md)).toMatchSnapshot()
  })

  test('Images with dimensions (parseImgDimensions)', () => {
    // Showdown supports "=WxH" style parsing when enabled.
    const md = '![alt text](https://example.com/a.png =120x80)'
    expect(render(md)).toMatchSnapshot()
  })

  test('Details/Summary allowed through sanitizer + markdown inside', () => {
    const md = [
      '<details>',
      '<summary>More</summary>',
      '',
      'Inside **bold** and a list:',
      '- a',
      '- b',
      '',
      '</details>',
    ].join('\n')

    expect(render(md)).toMatchSnapshot()
  })

  test('Sanitization: scripts removed (not the main focus, but safety baseline)', () => {
    const md = [
      'Hello',
      '',
      '<script>alert("xss")</script>',
      '',
      'Bye',
    ].join('\n')

    expect(render(md)).toMatchSnapshot()
  })

  test('Sanitization: dangerous attributes removed (e.g. onerror)', () => {
    const md = '<img src="https://example.com/x.png" onerror="alert(1)" />'
    expect(render(md)).toMatchSnapshot()
  })

  test('Sanitization: disallowed tags dropped (e.g. iframe)', () => {
    const md = '<iframe src="https://evil.example"></iframe>'
    expect(render(md)).toMatchSnapshot()
  })

  test('Sanitization options can be overridden (example: allow only a subset)', () => {
    const md = 'Hello **bold** <em>html em</em>'
    const html = render(md, {
      allowedTags: ['p'], // very restrictive on purpose
    })
    expect(html).toMatchSnapshot()
  })
})
