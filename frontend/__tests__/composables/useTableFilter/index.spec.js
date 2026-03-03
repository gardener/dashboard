//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { ref } from 'vue'
import {
  describe,
  it,
  expect,
} from 'vitest'

import { useTableFilter } from '@/composables/useTableFilter'

describe('composables/useTableFilter', () => {
  describe('useTableFilter', () => {
    it('should return all items when search query is empty', () => {
      const items = ref([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ])
      const searchQuery = ref('')
      const filterFn = (item, query) => item.name.toLowerCase().includes(query.toLowerCase())

      const { filteredItems } = useTableFilter({ items, searchQuery, filterFn })

      expect(filteredItems.value).toHaveLength(2)
      expect(filteredItems.value).toEqual(items.value)
    })

    it('should return all items when search query is whitespace only', () => {
      const items = ref([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ])
      const searchQuery = ref('   ')
      const filterFn = (item, query) => item.name.toLowerCase().includes(query.toLowerCase())

      const { filteredItems } = useTableFilter({ items, searchQuery, filterFn })

      expect(filteredItems.value).toHaveLength(2)
    })

    it('should filter items based on search query', () => {
      const items = ref([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ])
      const searchQuery = ref('ali')
      const filterFn = (item, query) => item.name.toLowerCase().includes(query.toLowerCase())

      const { filteredItems } = useTableFilter({ items, searchQuery, filterFn })

      expect(filteredItems.value).toHaveLength(1)
      expect(filteredItems.value[0].name).toBe('Alice')
    })

    it('should be case-insensitive when using appropriate filter function', () => {
      const items = ref([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ])
      const searchQuery = ref('ALICE')
      const filterFn = (item, query) => item.name.toLowerCase().includes(query.toLowerCase())

      const { filteredItems } = useTableFilter({ items, searchQuery, filterFn })

      expect(filteredItems.value).toHaveLength(1)
      expect(filteredItems.value[0].name).toBe('Alice')
    })

    it('should react to changes in search query', () => {
      const items = ref([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ])
      const searchQuery = ref('ali')
      const filterFn = (item, query) => item.name.toLowerCase().includes(query.toLowerCase())

      const { filteredItems } = useTableFilter({ items, searchQuery, filterFn })

      expect(filteredItems.value).toHaveLength(1)

      searchQuery.value = 'bo'
      expect(filteredItems.value).toHaveLength(1)
      expect(filteredItems.value[0].name).toBe('Bob')

      searchQuery.value = ''
      expect(filteredItems.value).toHaveLength(3)
    })

    it('should react to changes in items', () => {
      const items = ref([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ])
      const searchQuery = ref('ali')
      const filterFn = (item, query) => item.name.toLowerCase().includes(query.toLowerCase())

      const { filteredItems } = useTableFilter({ items, searchQuery, filterFn })

      expect(filteredItems.value).toHaveLength(1)

      items.value = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Alison' },
      ]

      expect(filteredItems.value).toHaveLength(2)
      expect(filteredItems.value.map(item => item.name)).toEqual(['Alice', 'Alison'])
    })

    it('should throw error when filterFn option is missing', () => {
      const items = ref([])
      const searchQuery = ref('')

      expect(() => {
        useTableFilter({ items, searchQuery })
      }).toThrow('useTableFilter: filterFn option is required and must be a function')
    })

    it('should throw error when filterFn is not a function', () => {
      const items = ref([])
      const searchQuery = ref('')

      expect(() => {
        useTableFilter({ items, searchQuery, filterFn: 'not a function' })
      }).toThrow('useTableFilter: filterFn option is required and must be a function')
    })
  })
})
