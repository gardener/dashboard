//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const markdown = require('../dist/lib/markdown')
async function render (md, sanitizeOptions) {
  const { makeSanitizedHtml } = markdown.createConverter()
  const html = await makeSanitizedHtml(md)
  return html.replace(/\r\n/g, '\n').trim()
}

describe('createConverter().makeSanitizedHtml', () => {
  test('basic markdown: emphasis, strong, links, line breaks', async () => {
    const md = [
      'Hello *world* and **friends**.',
      '',
      'A link: https://example.com',
      '',
      'Line 1',
      'Line 2 (should be a simple line break with `simpleLineBreaks`).',
    ].join('\n')

    expect(await render(md)).toMatchSnapshot()
  })

  test('GitHub-style fenced code blocks (ghCodeBlocks)', async () => {
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

    expect(await render(md)).toMatchSnapshot()
  })

  test('GFM tables (tables)', async () => {
    const md = [
      '| col A | col B |',
      '| --- | ---: |',
      '| left |  123 |',
      '| wow  |    4 |',
    ].join('\n')

    expect(await render(md)).toMatchSnapshot()
  })

  test('Task lists (tasklists)', async () => {
    const md = [
      '- [ ] todo',
      '- [x] done',
      '  - [ ] nested',
    ].join('\n')

    expect(await render(md)).toMatchSnapshot()
  })

  test('Heading IDs (ghCompatibleHeaderId)', async () => {
    const md = [
      '# Hello World',
      '## Hello World', // same text twice, show how IDs are generated
      '### Ümlaut & Symbols!',
    ].join('\n')

    expect(await render(md)).toMatchSnapshot()
  })

  test('Emoji (emoji)', async () => {
    const md = 'Ship it :rocket: and smile :smile:'
    expect(await render(md)).toMatchSnapshot()
  })

  test('Details/Summary allowed through sanitizer + markdown inside', async () => {
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

    expect(await render(md)).toMatchSnapshot()
  })

  test('Links: target/rel enforced and javascript: stripped', async () => {
    const md = [
    // autolink
      'https://example.com',
      '',
      // explicit link with dangerous scheme
      '[xss](javascript:alert(1))',
      '',
      // mailto allowed
      '[mail](mailto:test@example.com)',
      '',
      // raw HTML anchor with weird rel/target
      '<a href="https://safe.example" target="_self" rel="friend">safe</a>',
    ].join('\n')

    expect(await render(md)).toMatchSnapshot()
  })

  test('Images: allow src/alt/title/width/height, strip event handlers + disallow non-img data schemes elsewhere', async () => {
    const md = [
    // Allowed attributes
      '<img src="https://example.com/x.png" alt="x" title="t" width="10" height="20" />',
      '',
      // Strip dangerous attributes
      '<img src="https://example.com/x.png" onerror="alert(1)" onclick="alert(2)" />',
      '',
      // Allow data: for img only (tiny 1x1 gif)
      '<img alt="px" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" />',
      '',
      // data: in links should be stripped if you removed data: from global schemes
      '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">bad</a>',
    ].join('\n')

    expect(await render(md)).toMatchSnapshot()
  })

  test('Details/Summary: allow open attribute, strip others', async () => {
    const md = [
      '<details open data-evil="1">',
      '<summary onclick="alert(1)">More</summary>',
      '',
      'Inside **bold**',
      '',
      '</details>',
    ].join('\n')

    expect(await render(md)).toMatchSnapshot()
  })

  test('Task lists: only disabled checkboxes; non-checkbox inputs dropped', async () => {
    const md = [
      '- [ ] todo',
      '- [x] done',
      '',
      // Raw HTML attempts
      '<input type="text" value="pwned" />',
      '<input type="checkbox" />',
      '<input type="checkbox" checked />',
    ].join('\n')

    expect(await render(md)).toMatchSnapshot()
  })

  test('Tables: allow align on th/td; strip style/class', async () => {
    const md = [
      '| A | B |',
      '| - | -: |',
      '| x | y |',
      '',
      // raw HTML table cell attrs
      '<table>',
      '<tr><th align="center" style="color:red" class="c">H</th><td align="right" onclick="alert(1)">1</td></tr>',
      '</table>',
    ].join('\n')

    expect(await render(md)).toMatchSnapshot()
  })

  test('Headings: id preserved (rehype-slug), strip other attrs', async () => {
    const md = [
      '# Hello',
      '',
      // raw HTML heading with extra attributes
      '<h2 id="keep-me" onclick="alert(1)" class="c">Raw</h2>',
    ].join('\n')

    expect(await render(md)).toMatchSnapshot()
  })

  test('General: style attributes stripped, scripts dropped, harmless spans dropped by default', async () => {
    const md = [
      '<p style="color:red">red?</p>',
      '<span>span</span>',
      '<div onclick="alert(1)">click</div>',
      '<script>alert(1)</script>',
    ].join('\n')

    expect(await render(md)).toMatchSnapshot()
  })

  test('Sanitization: scripts removed (not the main focus, but safety baseline)', async () => {
    const md = [
      'Hello',
      '',
      '<script>alert("xss")</script>',
      '',
      'Bye',
    ].join('\n')

    expect(await render(md)).toMatchSnapshot()
  })

  test('Sanitization: dangerous attributes removed (e.g. onerror)', async () => {
    const md = '<img src="https://example.com/x.png" onerror="alert(1)" />'
    expect(await render(md)).toMatchSnapshot()
  })

  test('Sanitization: disallowed tags dropped (e.g. iframe)', async () => {
    const md = '<iframe src="https://evil.example"></iframe>'
    expect(await render(md)).toMatchSnapshot()
  })

  test('Sanitization options can be overridden (example: allow only a subset)', async () => {
    const md = 'Hello **bold** <em>html em</em>'
    const html = await render(md, {
      allowedTags: ['p'], // very restrictive on purpose
    })
    expect(html).toMatchSnapshot()
  })

  test('YAML folded: markdown after inline <details> is still parsed', async () => {
  // This mimics YAML ">" folding: newline becomes space, so markdown lands on same line.
    const md = '<details>more</details> EU Access is an optional *service*'
    expect(await render(md)).toMatchSnapshot()
  })

  test('Non-string input does not throw (treated as empty)', async () => {
  // Your converter already coalesces null/undefined to empty, but we ensure it never throws.
    expect(await render({})).toMatchSnapshot()
  })
})
