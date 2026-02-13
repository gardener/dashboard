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

    it('should return empty array for empty string', () => {
      const tokens = tokenizeSearch('')
      expect(tokens).toEqual([])
    })

    it('should return empty array for non-string input', () => {
      const tokens = tokenizeSearch(null)
      expect(tokens).toEqual([])
    })
  })

  describe('SearchQuery', () => {
    describe('matches', () => {
      it('should match simple term', () => {
        const query = new SearchQuery([{ value: 'aws', exact: false, exclude: false }])
        const values = ['aws-region', 'us-east-1']
        expect(query.matches(values)).toBe(true)
      })

      it('should not match when term is not present', () => {
        const query = new SearchQuery([{ value: 'azure', exact: false, exclude: false }])
        const values = ['aws-region', 'us-east-1']
        expect(query.matches(values)).toBe(false)
      })

      it('should match exact term', () => {
        const query = new SearchQuery([{ value: 'aws', exact: true, exclude: false }])
        const values = ['aws', 'us-east-1']
        expect(query.matches(values)).toBe(true)
      })

      it('should not match exact term when only substring matches', () => {
        const query = new SearchQuery([{ value: 'aws', exact: true, exclude: false }])
        const values = ['aws-region', 'us-east-1']
        expect(query.matches(values)).toBe(false)
      })

      it('should handle exclusion with minus sign', () => {
        const query = new SearchQuery([{ value: 'azure', exact: false, exclude: true }])
        const values = ['aws-region', 'us-east-1']
        expect(query.matches(values)).toBe(true)
      })

      it('should not match when excluded term is present', () => {
        const query = new SearchQuery([{ value: 'azure', exact: false, exclude: true }])
        const values = ['azure-region', 'west-eu']
        expect(query.matches(values)).toBe(false)
      })

      it('should match multiple terms with AND logic', () => {
        const query = new SearchQuery([
          { value: 'aws', exact: false, exclude: false },
          { value: 'east', exact: false, exclude: false },
        ])
        const values = ['aws-region', 'us-east-1']
        expect(query.matches(values)).toBe(true)
      })

      it('should not match when any term is missing (AND logic)', () => {
        const query = new SearchQuery([
          { value: 'aws', exact: false, exclude: false },
          { value: 'west', exact: false, exclude: false },
        ])
        const values = ['aws-region', 'us-east-1']
        expect(query.matches(values)).toBe(false)
      })

      it('should handle combination of inclusion and exclusion', () => {
        const query = new SearchQuery([
          { value: 'aws', exact: false, exclude: false },
          { value: 'azure', exact: false, exclude: true },
        ])
        const values = ['aws-region', 'us-east-1']
        expect(query.matches(values)).toBe(true)
      })
    })
  })

  describe('parseSearch', () => {
    it('should parse simple search term', () => {
      const query = parseSearch('aws')
      expect(query.terms).toHaveLength(1)
      expect(query.terms[0]).toEqual({ value: 'aws', exact: false, exclude: false })
    })

    it('should parse multiple search terms', () => {
      const query = parseSearch('aws gcp azure')
      expect(query.terms).toHaveLength(3)
      expect(query.terms[0]).toEqual({ value: 'aws', exact: false, exclude: false })
      expect(query.terms[1]).toEqual({ value: 'gcp', exact: false, exclude: false })
      expect(query.terms[2]).toEqual({ value: 'azure', exact: false, exclude: false })
    })

    it('should parse quoted phrase for exact matching', () => {
      const query = parseSearch('"us-east-1"')
      expect(query.terms).toHaveLength(1)
      expect(query.terms[0]).toEqual({ value: 'us-east-1', exact: true, exclude: false })
    })

    it('should parse exclusion with minus sign', () => {
      const query = parseSearch('-azure')
      expect(query.terms).toHaveLength(1)
      expect(query.terms[0]).toEqual({ value: 'azure', exact: false, exclude: true })
    })

    it('should parse quoted exclusion', () => {
      const query = parseSearch('-"my seed"')
      expect(query.terms).toHaveLength(1)
      expect(query.terms[0]).toEqual({ value: 'my seed', exact: true, exclude: true })
    })

    it('should parse mixed search terms', () => {
      const query = parseSearch('aws -azure "us-east-1"')
      expect(query.terms).toHaveLength(3)
      expect(query.terms[0]).toEqual({ value: 'aws', exact: false, exclude: false })
      expect(query.terms[1]).toEqual({ value: 'azure', exact: false, exclude: true })
      expect(query.terms[2]).toEqual({ value: 'us-east-1', exact: true, exclude: false })
    })

    it('should handle escaped quotes within quoted strings', () => {
      const query = parseSearch('"test ""quoted"" value"')
      expect(query.terms).toHaveLength(1)
      expect(query.terms[0]).toEqual({ value: 'test "quoted" value', exact: true, exclude: false })
    })

    it('should ignore empty terms', () => {
      const query = parseSearch('aws  gcp')
      expect(query.terms).toHaveLength(2)
    })

    it('should handle empty string', () => {
      const query = parseSearch('')
      expect(query.terms).toHaveLength(0)
    })

    it('should create SearchQuery that matches correctly', () => {
      const query = parseSearch('aws -azure')
      const values = ['aws-region', 'us-east-1']
      expect(query.matches(values)).toBe(true)

      const values2 = ['azure-region', 'west-eu']
      expect(query.matches(values2)).toBe(false)
    })
  })
})
