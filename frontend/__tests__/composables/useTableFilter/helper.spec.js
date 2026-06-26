//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  describe,
  it,
  expect,
} from 'vitest'

import {
  parseSearch,
  tokenizeSearch,
  SearchQuery,
} from '@/composables/useTableFilter/helper'

describe('composables/useTableFilter', () => {
  describe('tokenizeSearch', () => {
    it('should tokenize simple words', () => {
      const tokens = tokenizeSearch('aws azure gcp')
      expect(tokens).toEqual(['aws', 'azure', 'gcp'])
    })

    it('should handle quoted phrases', () => {
      const tokens = tokenizeSearch('"my seed" aws')
      expect(tokens).toEqual(['"my seed"', 'aws'])
    })

    it('should handle mixed quotes and words', () => {
      const tokens = tokenizeSearch('aws "us-east-1" -azure')
      expect(tokens).toEqual(['aws', '"us-east-1"', '-azure'])
    })

    it('should handle escaped quotes in quoted strings', () => {
      const tokens = tokenizeSearch('"test ""quoted"" value"')
      expect(tokens).toEqual(['"test ""quoted"" value"'])
    })

    it('should keep field-qualified bare value as one token', () => {
      const tokens = tokenizeSearch('seed:aws-ha azure')
      expect(tokens).toEqual(['seed:aws-ha', 'azure'])
    })

    it('should keep field-qualified quoted value as one token', () => {
      const tokens = tokenizeSearch('seed:"two words" azure')
      expect(tokens).toEqual(['seed:"two words"', 'azure'])
    })

    it('should keep negated field-qualified quoted value as one token', () => {
      const tokens = tokenizeSearch('-seed:"two words"')
      expect(tokens).toEqual(['-seed:"two words"'])
    })

    it('should return empty array for empty string', () => {
      const tokens = tokenizeSearch('')
      expect(tokens).toEqual([])
    })

    it('should return empty array for non-string input', () => {
      const tokens = tokenizeSearch(null)
      expect(tokens).toEqual([])
    })

    it('should preserve whitespace inside quotes', () => {
      const tokens = tokenizeSearch('"a  b\tc"')
      expect(tokens).toEqual(['"a  b\tc"'])
    })

    it('should split on tabs and newlines outside quotes', () => {
      const tokens = tokenizeSearch('aws\tgcp\nazure')
      expect(tokens).toEqual(['aws', 'gcp', 'azure'])
    })

    it('should keep quote-adjacent bare chars as part of the same token', () => {
      // imperative tokenizer treats `"foo"bar` as one contiguous token
      const tokens = tokenizeSearch('"foo"bar')
      expect(tokens).toEqual(['"foo"bar'])
    })

    it('should consume an unclosed quoted run to end of input', () => {
      const tokens = tokenizeSearch('aws "unterminated value')
      expect(tokens).toEqual(['aws', '"unterminated value'])
    })

    it('should collapse runs of whitespace', () => {
      const tokens = tokenizeSearch('  aws   gcp  ')
      expect(tokens).toEqual(['aws', 'gcp'])
    })
  })

  describe('SearchQuery', () => {
    describe('matches', () => {
      it('should match simple term against any field', () => {
        const query = new SearchQuery([{ field: null, value: 'aws', exact: false, exclude: false }])
        expect(query.matches({ name: 'aws-region', region: 'us-east-1' })).toBe(true)
      })

      it('should not match when term is not present in any field', () => {
        const query = new SearchQuery([{ field: null, value: 'azure', exact: false, exclude: false }])
        expect(query.matches({ name: 'aws-region', region: 'us-east-1' })).toBe(false)
      })

      it('should match exact term', () => {
        const query = new SearchQuery([{ field: null, value: 'aws', exact: true, exclude: false }])
        expect(query.matches({ name: 'aws', region: 'us-east-1' })).toBe(true)
      })

      it('should not match exact term when only substring matches', () => {
        const query = new SearchQuery([{ field: null, value: 'aws', exact: true, exclude: false }])
        expect(query.matches({ name: 'aws-region', region: 'us-east-1' })).toBe(false)
      })

      it('should handle exclusion with minus sign', () => {
        const query = new SearchQuery([{ field: null, value: 'azure', exact: false, exclude: true }])
        expect(query.matches({ name: 'aws-region', region: 'us-east-1' })).toBe(true)
      })

      it('should not match when excluded term is present', () => {
        const query = new SearchQuery([{ field: null, value: 'azure', exact: false, exclude: true }])
        expect(query.matches({ name: 'azure-region', region: 'west-eu' })).toBe(false)
      })

      it('should match multiple terms with AND logic', () => {
        const query = new SearchQuery([
          { field: null, value: 'aws', exact: false, exclude: false },
          { field: null, value: 'east', exact: false, exclude: false },
        ])
        expect(query.matches({ name: 'aws-region', region: 'us-east-1' })).toBe(true)
      })

      it('should not match when any term is missing (AND logic)', () => {
        const query = new SearchQuery([
          { field: null, value: 'aws', exact: false, exclude: false },
          { field: null, value: 'west', exact: false, exclude: false },
        ])
        expect(query.matches({ name: 'aws-region', region: 'us-east-1' })).toBe(false)
      })

      it('should handle combination of inclusion and exclusion', () => {
        const query = new SearchQuery([
          { field: null, value: 'aws', exact: false, exclude: false },
          { field: null, value: 'azure', exact: false, exclude: true },
        ])
        expect(query.matches({ name: 'aws-region', region: 'us-east-1' })).toBe(true)
      })

      it('should match qualified term only against its field', () => {
        const query = new SearchQuery([{ field: 'seed', value: 'aws-ha', exact: false, exclude: false }])
        expect(query.matches({ name: 'aws-ha-cluster', seed: 'aws-ha' })).toBe(true)
        expect(query.matches({ name: 'aws-ha-cluster', seed: 'gcp-ha' })).toBe(false)
      })

      it('should not match qualified term when field value is missing', () => {
        const query = new SearchQuery([{ field: 'seed', value: 'aws-ha', exact: false, exclude: false }])
        expect(query.matches({ name: 'aws-ha-cluster' })).toBe(false)
      })

      it('should treat null field value same as missing', () => {
        const query = new SearchQuery([{ field: 'seed', value: 'aws-ha', exact: false, exclude: false }])
        expect(query.matches({ name: 'aws-ha-cluster', seed: null })).toBe(false)
      })

      it('should match empty value term against null/undefined/empty field', () => {
        const query = new SearchQuery([{ field: 'seed', value: '', exact: false, exclude: false }])
        expect(query.matches({ name: 'cluster', seed: null })).toBe(true)
        expect(query.matches({ name: 'cluster', seed: undefined })).toBe(true)
        expect(query.matches({ name: 'cluster', seed: '' })).toBe(true)
        expect(query.matches({ name: 'cluster', seed: 'aws-ha' })).toBe(false)
      })

      it('should support excluding empty field values', () => {
        const query = new SearchQuery([{ field: 'seed', value: '', exact: false, exclude: true }])
        // has a seed → empty not found → exclusion passes
        expect(query.matches({ name: 'cluster', seed: 'aws-ha' })).toBe(true)
        // no seed → empty found → exclusion rejects
        expect(query.matches({ name: 'cluster', seed: null })).toBe(false)
      })

      it('should treat missing qualified-field value as not-found for exclusion', () => {
        const query = new SearchQuery([{ field: 'seed', value: 'aws-ha', exact: false, exclude: true }])
        // missing seed → not found → exclusion passes
        expect(query.matches({ name: 'cluster' })).toBe(true)
        expect(query.matches({ name: 'cluster', seed: 'gcp-ha' })).toBe(true)
        expect(query.matches({ name: 'cluster', seed: 'aws-ha' })).toBe(false)
      })

      it('should support exact qualified match', () => {
        const query = new SearchQuery([{ field: 'seed', value: 'aws', exact: true, exclude: false }])
        expect(query.matches({ seed: 'aws' })).toBe(true)
        expect(query.matches({ seed: 'aws-ha' })).toBe(false)
      })

      it('should combine qualified and unqualified terms', () => {
        const query = new SearchQuery([
          { field: 'seed', value: 'aws-ha', exact: false, exclude: false },
          { field: null, value: 'prod', exact: false, exclude: false },
        ])
        expect(query.matches({ name: 'prod-cluster', seed: 'aws-ha' })).toBe(true)
        expect(query.matches({ name: 'dev-cluster', seed: 'aws-ha' })).toBe(false)
        expect(query.matches({ name: 'prod-cluster', seed: 'gcp-ha' })).toBe(false)
      })
    })
  })

  describe('parseSearch', () => {
    it('should parse simple search term', () => {
      const query = parseSearch('aws')
      expect(query.terms).toHaveLength(1)
      expect(query.terms[0]).toEqual({ field: null, value: 'aws', exact: false, exclude: false })
    })

    it('should parse multiple search terms', () => {
      const query = parseSearch('aws gcp azure')
      expect(query.terms).toHaveLength(3)
      expect(query.terms[0]).toEqual({ field: null, value: 'aws', exact: false, exclude: false })
      expect(query.terms[1]).toEqual({ field: null, value: 'gcp', exact: false, exclude: false })
      expect(query.terms[2]).toEqual({ field: null, value: 'azure', exact: false, exclude: false })
    })

    it('should parse quoted phrase for exact matching', () => {
      const query = parseSearch('"us-east-1"')
      expect(query.terms).toHaveLength(1)
      expect(query.terms[0]).toEqual({ field: null, value: 'us-east-1', exact: true, exclude: false })
    })

    it('should parse exclusion with minus sign', () => {
      const query = parseSearch('-azure')
      expect(query.terms).toHaveLength(1)
      expect(query.terms[0]).toEqual({ field: null, value: 'azure', exact: false, exclude: true })
    })

    it('should parse quoted exclusion', () => {
      const query = parseSearch('-"my seed"')
      expect(query.terms).toHaveLength(1)
      expect(query.terms[0]).toEqual({ field: null, value: 'my seed', exact: true, exclude: true })
    })

    it('should parse mixed search terms', () => {
      const query = parseSearch('aws -azure "us-east-1"')
      expect(query.terms).toHaveLength(3)
      expect(query.terms[0]).toEqual({ field: null, value: 'aws', exact: false, exclude: false })
      expect(query.terms[1]).toEqual({ field: null, value: 'azure', exact: false, exclude: true })
      expect(query.terms[2]).toEqual({ field: null, value: 'us-east-1', exact: true, exclude: false })
    })

    it('should handle escaped quotes within quoted strings', () => {
      const query = parseSearch('"test ""quoted"" value"')
      expect(query.terms).toHaveLength(1)
      expect(query.terms[0]).toEqual({ field: null, value: 'test "quoted" value', exact: true, exclude: false })
    })

    it('should ignore empty terms', () => {
      const query = parseSearch('aws  gcp')
      expect(query.terms).toHaveLength(2)
    })

    it('should handle empty string', () => {
      const query = parseSearch('')
      expect(query.terms).toHaveLength(0)
    })

    it('should parse field-qualified bare term when field is allowed', () => {
      const query = parseSearch('seed:aws-ha', ['seed'])
      expect(query.terms).toHaveLength(1)
      expect(query.terms[0]).toEqual({ field: 'seed', value: 'aws-ha', exact: false, exclude: false })
    })

    it('should parse field-qualified quoted term when field is allowed', () => {
      const query = parseSearch('seed:"two words"', ['seed'])
      expect(query.terms).toHaveLength(1)
      expect(query.terms[0]).toEqual({ field: 'seed', value: 'two words', exact: true, exclude: false })
    })

    it('should parse negated field-qualified term', () => {
      const query = parseSearch('-seed:aws-ha', ['seed'])
      expect(query.terms).toHaveLength(1)
      expect(query.terms[0]).toEqual({ field: 'seed', value: 'aws-ha', exact: false, exclude: true })
    })

    it('should parse negated field-qualified quoted term', () => {
      const query = parseSearch('-seed:"two words"', ['seed'])
      expect(query.terms).toHaveLength(1)
      expect(query.terms[0]).toEqual({ field: 'seed', value: 'two words', exact: true, exclude: true })
    })

    it('should treat unknown field qualifier as literal', () => {
      const query = parseSearch('foo:bar', ['seed'])
      expect(query.terms).toHaveLength(1)
      expect(query.terms[0]).toEqual({ field: null, value: 'foo:bar', exact: false, exclude: false })
    })

    it('should treat negated unknown field qualifier as literal exclusion', () => {
      const query = parseSearch('-foo:bar', ['seed'])
      expect(query.terms).toHaveLength(1)
      expect(query.terms[0]).toEqual({ field: null, value: 'foo:bar', exact: false, exclude: true })
    })

    it('should treat qualified value with no allowlist as literal', () => {
      const query = parseSearch('seed:aws-ha')
      expect(query.terms).toHaveLength(1)
      expect(query.terms[0]).toEqual({ field: null, value: 'seed:aws-ha', exact: false, exclude: false })
    })

    it('should mix qualified and unqualified terms', () => {
      const query = parseSearch('seed:aws-ha -region:eu prod foo:bar', ['seed', 'region'])
      expect(query.terms).toHaveLength(4)
      expect(query.terms[0]).toEqual({ field: 'seed', value: 'aws-ha', exact: false, exclude: false })
      expect(query.terms[1]).toEqual({ field: 'region', value: 'eu', exact: false, exclude: true })
      expect(query.terms[2]).toEqual({ field: null, value: 'prod', exact: false, exclude: false })
      expect(query.terms[3]).toEqual({ field: null, value: 'foo:bar', exact: false, exclude: false })
    })

    it('should accept allowlist as a Set', () => {
      const query = parseSearch('seed:aws-ha', new Set(['seed']))
      expect(query.terms[0].field).toBe('seed')
    })

    it('should accept underscore-prefixed custom field keys', () => {
      const query = parseSearch('Z_costCenter:42', ['Z_costCenter'])
      expect(query.terms).toHaveLength(1)
      expect(query.terms[0]).toEqual({ field: 'Z_costCenter', value: '42', exact: false, exclude: false })
    })

    it('should parse field-qualified empty quoted value as empty-match term', () => {
      const query = parseSearch('seed:""', ['seed'])
      expect(query.terms).toHaveLength(1)
      expect(query.terms[0]).toEqual({ field: 'seed', value: '', exact: true, exclude: false })
    })

    it('should parse negated field-qualified empty quoted value', () => {
      const query = parseSearch('-seed:""', ['seed'])
      expect(query.terms).toHaveLength(1)
      expect(query.terms[0]).toEqual({ field: 'seed', value: '', exact: true, exclude: true })
    })

    it('should drop bare empty field (no quotes)', () => {
      const query = parseSearch('seed:', ['seed'])
      expect(query.terms).toHaveLength(1)
      expect(query.terms[0]).toEqual({ field: 'seed', value: '', exact: false, exclude: false })
    })

    it('should create SearchQuery that matches correctly', () => {
      const query = parseSearch('aws -azure')
      expect(query.matches({ name: 'aws-region', region: 'us-east-1' })).toBe(true)
      expect(query.matches({ name: 'azure-region', region: 'west-eu' })).toBe(false)
    })

    it('should create SearchQuery that field-matches correctly', () => {
      const query = parseSearch('seed:aws-ha', ['seed'])
      expect(query.matches({ name: 'aws-ha-cluster', seed: 'aws-ha' })).toBe(true)
      // substring on name only must NOT satisfy qualified seed term
      expect(query.matches({ name: 'aws-ha-cluster', seed: 'gcp-ha' })).toBe(false)
    })
  })
})
