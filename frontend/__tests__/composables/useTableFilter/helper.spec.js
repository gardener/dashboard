//
// SPDX-FileCopyrightText: Copyright Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  describe,
  it,
  expect,
  vi,
} from 'vitest'

import {
  parseSearch,
  tokenizeSearch,
  SearchQuery,
} from '@/composables/useTableFilter/helper'

function fieldSpecs (fields) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [
    key,
    { get: () => value },
  ]))
}

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
        expect(query.matches(fieldSpecs({ name: 'aws-region', region: 'us-east-1' }))).toBe(true)
      })

      it('should not match when term is not present in any field', () => {
        const query = new SearchQuery([{ field: null, value: 'azure', exact: false, exclude: false }])
        expect(query.matches(fieldSpecs({ name: 'aws-region', region: 'us-east-1' }))).toBe(false)
      })

      it('should match exact term', () => {
        const query = new SearchQuery([{ field: null, value: 'aws', exact: true, exclude: false }])
        expect(query.matches(fieldSpecs({ name: 'aws', region: 'us-east-1' }))).toBe(true)
      })

      it('should not match exact term when only substring matches', () => {
        const query = new SearchQuery([{ field: null, value: 'aws', exact: true, exclude: false }])
        expect(query.matches(fieldSpecs({ name: 'aws-region', region: 'us-east-1' }))).toBe(false)
      })

      it('should handle exclusion with minus sign', () => {
        const query = new SearchQuery([{ field: null, value: 'azure', exact: false, exclude: true }])
        expect(query.matches(fieldSpecs({ name: 'aws-region', region: 'us-east-1' }))).toBe(true)
      })

      it('should not match when excluded term is present', () => {
        const query = new SearchQuery([{ field: null, value: 'azure', exact: false, exclude: true }])
        expect(query.matches(fieldSpecs({ name: 'azure-region', region: 'west-eu' }))).toBe(false)
      })

      it('should match multiple terms with AND logic', () => {
        const query = new SearchQuery([
          { field: null, value: 'aws', exact: false, exclude: false },
          { field: null, value: 'east', exact: false, exclude: false },
        ])
        expect(query.matches(fieldSpecs({ name: 'aws-region', region: 'us-east-1' }))).toBe(true)
      })

      it('should not match when any term is missing (AND logic)', () => {
        const query = new SearchQuery([
          { field: null, value: 'aws', exact: false, exclude: false },
          { field: null, value: 'west', exact: false, exclude: false },
        ])
        expect(query.matches(fieldSpecs({ name: 'aws-region', region: 'us-east-1' }))).toBe(false)
      })

      it('should handle combination of inclusion and exclusion', () => {
        const query = new SearchQuery([
          { field: null, value: 'aws', exact: false, exclude: false },
          { field: null, value: 'azure', exact: false, exclude: true },
        ])
        expect(query.matches(fieldSpecs({ name: 'aws-region', region: 'us-east-1' }))).toBe(true)
      })

      it('should match qualified term only against its field', () => {
        const query = new SearchQuery([{ field: 'seed', value: 'aws-ha', exact: false, exclude: false }])
        expect(query.matches(fieldSpecs({ name: 'aws-ha-cluster', seed: 'aws-ha' }))).toBe(true)
        expect(query.matches(fieldSpecs({ name: 'aws-ha-cluster', seed: 'gcp-ha' }))).toBe(false)
      })

      it('should not match qualified term when field value is missing', () => {
        const query = new SearchQuery([{ field: 'seed', value: 'aws-ha', exact: false, exclude: false }])
        expect(query.matches(fieldSpecs({ name: 'aws-ha-cluster' }))).toBe(false)
      })

      it('should treat inherited qualified fields as missing', () => {
        const query = parseSearch('constructor:value', ['constructor'])
        expect(query.matches(fieldSpecs({ name: 'shoot' }))).toBe(false)
      })

      it('should treat null field value same as missing', () => {
        const query = new SearchQuery([{ field: 'seed', value: 'aws-ha', exact: false, exclude: false }])
        expect(query.matches(fieldSpecs({ name: 'aws-ha-cluster', seed: null }))).toBe(false)
      })

      it('should match empty value term against null/undefined/empty field', () => {
        const query = new SearchQuery([{ field: 'seed', value: '', exact: false, exclude: false }])
        expect(query.matches(fieldSpecs({ name: 'cluster', seed: null }))).toBe(true)
        expect(query.matches(fieldSpecs({ name: 'cluster', seed: undefined }))).toBe(true)
        expect(query.matches(fieldSpecs({ name: 'cluster', seed: '' }))).toBe(true)
        expect(query.matches(fieldSpecs({ name: 'cluster', seed: 'aws-ha' }))).toBe(false)
      })

      it('should support excluding empty field values', () => {
        const query = new SearchQuery([{ field: 'seed', value: '', exact: false, exclude: true }])
        // has a seed → empty not found → exclusion passes
        expect(query.matches(fieldSpecs({ name: 'cluster', seed: 'aws-ha' }))).toBe(true)
        // no seed → empty found → exclusion rejects
        expect(query.matches(fieldSpecs({ name: 'cluster', seed: null }))).toBe(false)
      })

      it('should treat missing qualified-field value as not-found for exclusion', () => {
        const query = new SearchQuery([{ field: 'seed', value: 'aws-ha', exact: false, exclude: true }])
        // missing seed → not found → exclusion passes
        expect(query.matches(fieldSpecs({ name: 'cluster' }))).toBe(true)
        expect(query.matches(fieldSpecs({ name: 'cluster', seed: 'gcp-ha' }))).toBe(true)
        expect(query.matches(fieldSpecs({ name: 'cluster', seed: 'aws-ha' }))).toBe(false)
      })

      it('should support exact qualified match', () => {
        const query = new SearchQuery([{ field: 'seed', value: 'aws', exact: true, exclude: false }])
        expect(query.matches(fieldSpecs({ seed: 'aws' }))).toBe(true)
        expect(query.matches(fieldSpecs({ seed: 'aws-ha' }))).toBe(false)
      })

      it('should combine qualified and unqualified terms', () => {
        const query = new SearchQuery([
          { field: 'seed', value: 'aws-ha', exact: false, exclude: false },
          { field: null, value: 'prod', exact: false, exclude: false },
        ])
        expect(query.matches(fieldSpecs({ name: 'prod-cluster', seed: 'aws-ha' }))).toBe(true)
        expect(query.matches(fieldSpecs({ name: 'dev-cluster', seed: 'aws-ha' }))).toBe(false)
        expect(query.matches(fieldSpecs({ name: 'prod-cluster', seed: 'gcp-ha' }))).toBe(false)
      })

      it('should support custom field matchers while keeping exclusion outside the matcher', () => {
        const matchHealth = (term, value) => term.value === 'any' || term.value === value
        const query = new SearchQuery([{ field: 'health', value: 'any', exact: false, exclude: false }])
        const excludedQuery = new SearchQuery([{ field: 'health', value: 'any', exact: false, exclude: true }])
        const fields = {
          health: { get: () => 'healthy', match: matchHealth },
        }

        expect(query.matches(fields)).toBe(true)
        expect(excludedQuery.matches(fields)).toBe(false)
      })

      it('should only call the getter for a referenced qualified field', () => {
        const query = new SearchQuery([{ field: 'seed', value: 'aws-ha', exact: false, exclude: false }])
        const getName = vi.fn(() => 'aws-ha-cluster')
        const getSeed = vi.fn(() => 'aws-ha')

        expect(query.matches({
          name: { get: getName },
          seed: { get: getSeed },
        })).toBe(true)

        expect(getSeed).toHaveBeenCalledTimes(1)
        expect(getName).not.toHaveBeenCalled()
      })

      it('should exclude freeText false fields from unqualified matching', () => {
        const query = new SearchQuery([{ field: null, value: 'any', exact: false, exclude: false }])
        const getHealth = vi.fn(() => 'healthy')
        const matchHealth = vi.fn(() => true)

        expect(query.matches({
          name: { get: () => 'shoot' },
          health: {
            get: getHealth,
            match: matchHealth,
            freeText: false,
          },
        })).toBe(false)

        expect(getHealth).not.toHaveBeenCalled()
        expect(matchHealth).not.toHaveBeenCalled()
      })

      it('should still match unqualified terms against default free-text fields', () => {
        const query = new SearchQuery([{ field: null, value: 'aws', exact: false, exclude: false }])

        expect(query.matches(fieldSpecs({
          name: 'aws-region',
          region: 'us-east-1',
        }))).toBe(true)
      })

      it('should call a field getter once per matching term without memoization', () => {
        const query = new SearchQuery([
          { field: 'seed', value: 'aws', exact: false, exclude: false },
          { field: 'seed', value: 'ha', exact: false, exclude: false },
        ])
        const getSeed = vi.fn(() => 'aws-ha')

        expect(query.matches({
          seed: { get: getSeed },
        })).toBe(true)

        expect(getSeed).toHaveBeenCalledTimes(2)
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
      expect(query.matches(fieldSpecs({ name: 'aws-region', region: 'us-east-1' }))).toBe(true)
      expect(query.matches(fieldSpecs({ name: 'azure-region', region: 'west-eu' }))).toBe(false)
    })

    it('should create SearchQuery that field-matches correctly', () => {
      const query = parseSearch('seed:aws-ha', ['seed'])
      expect(query.matches(fieldSpecs({ name: 'aws-ha-cluster', seed: 'aws-ha' }))).toBe(true)
      // substring on name only must NOT satisfy qualified seed term
      expect(query.matches(fieldSpecs({ name: 'aws-ha-cluster', seed: 'gcp-ha' }))).toBe(false)
    })
  })

  describe('SearchQuery.matches with stringified field values', () => {
    it('should match numeric-like string field values via substring', () => {
      const query = parseSearch('42')
      expect(query.matches(fieldSpecs({ name: 'cluster', workers: '42' }))).toBe(true)
      expect(query.matches(fieldSpecs({ name: 'cluster', workers: '142' }))).toBe(true)
      expect(query.matches(fieldSpecs({ name: 'cluster', workers: '5' }))).toBe(false)
    })

    it('should match numeric-like string field values via exact match', () => {
      const query = parseSearch('"42"')
      expect(query.matches(fieldSpecs({ name: 'cluster', workers: '42' }))).toBe(true)
      expect(query.matches(fieldSpecs({ name: 'cluster', workers: '142' }))).toBe(false)
    })

    it('should match boolean-like string field values', () => {
      const query = parseSearch('true')
      expect(query.matches(fieldSpecs({ name: 'cluster', enabled: 'true' }))).toBe(true)
      expect(query.matches(fieldSpecs({ name: 'cluster', enabled: 'false' }))).toBe(false)
    })

    it('should not match when no field contains the term', () => {
      const query = parseSearch('xyz')
      expect(query.matches(fieldSpecs({ name: 'cluster', count: '99', flag: 'false' }))).toBe(false)
    })

    it('should coerce raw primitive field values before matching', () => {
      expect(parseSearch('42').matches(fieldSpecs({ workers: 142 }))).toBe(true)
      expect(parseSearch('"42"').matches(fieldSpecs({ workers: 42 }))).toBe(true)
      expect(parseSearch('true').matches(fieldSpecs({ enabled: true }))).toBe(true)
      expect(parseSearch('xyz').matches(fieldSpecs({ count: 99, flag: false }))).toBe(false)
    })
  })
})
