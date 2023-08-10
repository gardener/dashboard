// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { setActivePinia, createPinia } from 'pinia'
import { useAuthzStore } from '@/store/authz'
import { useProjectStore } from '@/store/project'

describe('stores', () => {
  describe('project', () => {
    const namespace = 'default'

    let authzStore
    let projectStore

    function setData ({ shootCustomFields, ...data }) {
      const annotations = {}
      if (shootCustomFields) {
        annotations['dashboard.gardener.cloud/shootCustomFields'] = JSON.stringify(shootCustomFields)
      }
      projectStore.list = [{
        metadata: {
          namespace,
          annotations,
        },
        data,
      }]
    }

    beforeEach(() => {
      setActivePinia(createPinia())
      authzStore = useAuthzStore()
      authzStore.setNamespace(namespace)
      projectStore = useProjectStore()
      projectStore.list = []
    })

    describe('#shootCustomFields', () => {
      const shootCustomFields = {
        custom1: {
          weight: 1,
          defaultValue: 'Default',
          path: 'metadata.name',
          name: 'Column Name',
          showColumn: true,
          showDetails: true,
          icon: 'mdi-icon',
        },
        custom2: {
          name: 'Name',
          path: 'path',
        },
        custom3: { // ignored, missing required property path
          name: 'name',
        },
        custom4: { // ignored, missing required property name
          path: 'path',
        },
        custom5: {}, // ignored
        custom6: null, // ignored
        custom7: { // ignored
          name: 'Foo',
          path: { foo: 'bar' }, // no objects allowed as values of custom field properties
        },
      }

      beforeEach(() => {
        setData({ shootCustomFields })
      })

      it('should return custom fields for shoots', () => {
        expect(projectStore.shootCustomFields).toStrictEqual({
          Z_custom1: {
            weight: 1,
            defaultValue: 'Default',
            path: 'metadata.name',
            name: 'Column Name',
            showColumn: true,
            showDetails: true,
            icon: 'mdi-icon',
            columnSelectedByDefault: true,
            searchable: true,
            sortable: true,
          },
          Z_custom2: {
            name: 'Name',
            path: 'path',
            columnSelectedByDefault: true,
            searchable: true,
            showColumn: true,
            showDetails: true,
            sortable: true,
          },
        })
      })
    })
  })
})
