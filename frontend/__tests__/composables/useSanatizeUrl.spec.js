//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  useSanitizeUrl,
  BLANK_URL,
} from '@/composables/useSanitizeUrl'

describe('composables', () => {
  describe('sanitizeUrl', () => {
    let sanitizeUrl

    beforeAll(() => {
      sanitizeUrl = useSanitizeUrl()
    })

    it('does not alter http URLs', () => {
      expect(sanitizeUrl('http://example.org/path/to/something')).toBe('http://example.org/path/to/something')
    })

    it('does not alter http URLs with ports', () => {
      expect(sanitizeUrl('http://example.org:4567/path/to/something')).toBe('http://example.org:4567/path/to/something')
    })

    it('does not alter https URLs', () => {
      expect(sanitizeUrl('https://example.com/path/to/something')).toBe('https://example.com/path/to/something')
    })

    it('does not alter https URLs with ports', () => {
      expect(sanitizeUrl('https://example.com:4567/path/to/something')).toBe('https://example.com:4567/path/to/something')
    })

    it('does not alter mailto urls', () => {
      expect(sanitizeUrl('mailto:test@example.com?subject=hello+world')).toBe('mailto:test@example.com?subject=hello+world')
    })

    it('adds trailing slash to origin urls', () => {
      expect(sanitizeUrl('https://example.org')).toBe('https://example.org/')
    })

    it('removes leading and trailing whitespaces from urls', () => {
      expect(sanitizeUrl('   https://example.org/path/to/something    ')).toBe('https://example.org/path/to/something')
    })

    it(`replaces blank urls with ${BLANK_URL}`, () => {
      expect(sanitizeUrl('')).toBe(BLANK_URL)
    })

    it(`replaces null values with ${BLANK_URL}`, () => {
      expect(sanitizeUrl(null)).toBe(BLANK_URL)
    })

    it(`replaces undefined values with ${BLANK_URL}`, () => {
      expect(sanitizeUrl()).toBe(BLANK_URL)
    })

    it('disallows relative-path reference URLs', () => {
      expect(sanitizeUrl('./path/to/something')).toBe(BLANK_URL)
    })

    it('disallows absolute-path reference URLs', () => {
      expect(sanitizeUrl('/path/to/something')).toBe(BLANK_URL)
    })

    it('disallows protocol-less network-path URLs', () => {
      expect(sanitizeUrl('//example.org')).toBe(BLANK_URL)
    })

    it('disallows protocol-less URLs', () => {
      expect(sanitizeUrl('example.org')).toBe(BLANK_URL)
    })

    it('disallows URLs with invalid protocols', () => {
      expect(sanitizeUrl('javascript:alert(document.domain)')).toBe(BLANK_URL)
      expect(sanitizeUrl('vbscript:alert(document.domain)')).toBe(BLANK_URL)
      expect(sanitizeUrl('data:image/bmp;base64,Qk0eAAAAAAAAABoAAAAMAAAAAQABAAEAGAAAAP8A')).toBe(BLANK_URL)
    })

    it('disallows URLs with all possible other protocols', () => {
      expect(sanitizeUrl('foo://example.org')).toBe(BLANK_URL)
      expect(sanitizeUrl('bar://example.org')).toBe(BLANK_URL)
      expect(sanitizeUrl('ftp://example.org')).toBe(BLANK_URL)
    })

    it('disallows URLs with unsupported protocols when the url begins with spaces', () => {
      expect(sanitizeUrl('  javascript:alert(document.domain)')).toBe(BLANK_URL)
      expect(sanitizeUrl('  foo://example.org')).toBe(BLANK_URL)
    })

    it('disallows urls that use &colon; for the colon portion of the url', () => {
      expect(sanitizeUrl('https&colon;//example.org')).toBe(BLANK_URL)
    })

    it('does not replace `javascript:` if it is not in the scheme of the URL', () => {
      expect(sanitizeUrl('https://example.org#javascript:foo')).toBe('https://example.org/#javascript:foo')
    })
  })
})
