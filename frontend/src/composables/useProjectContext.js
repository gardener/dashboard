//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  ref,
  shallowRef,
  computed,
  inject,
  provide,
} from 'vue'

import { cleanup } from '@/composables/helper'

import { useProjectShootCustomFields } from './useProjectShootCustomFields'
import { useProjectMetadata } from './useProjectMetadata'
import { useProjectCostObject } from './useProjectCostObject'

import cloneDeep from 'lodash/cloneDeep'
import get from 'lodash/get'
import isEqual from 'lodash/isEqual'
import set from 'lodash/set'

export function createProjectContextComposable () {
  function normalizeManifest (value) {
    const object = Object.assign({
      apiVersion: 'core.gardener.cloud/v1beta1',
      kind: 'Project',
    }, value)
    return cleanup(object)
  }

  /* initial manifest */
  const initialManifest = shallowRef(null)

  const normalizedInitialManifest = computed(() => {
    const object = cloneDeep(initialManifest.value)
    return normalizeManifest(object)
  })

  /* manifest */
  const manifest = ref({})

  const normalizedManifest = computed(() => {
    const object = cloneDeep(manifest.value)
    return normalizeManifest(object)
  })

  function setProjectManifest (value) {
    initialManifest.value = value
    manifest.value = cloneDeep(initialManifest.value)
  }

  function createProjectManifest () {
    manifest.value = {}
    initialManifest.value = cloneDeep(normalizedManifest.value)
  }

  const isProjectDirty = computed(() => {
    return !isEqual(normalizedManifest.value, normalizedInitialManifest.value)
  })

  /* metadata */
  const projectMetadataComposable = useProjectMetadata(manifest)
  const {
    projectName,
    projectTitle,
    isNewProject,
    getProjectAnnotation,
    setProjectAnnotation,
    unsetProjectAnnotation,
  } = projectMetadataComposable

  /* spec */
  const description = computed({
    get () {
      return get(manifest.value, ['spec', 'description'])
    },
    set (value) {
      set(manifest.value, ['spec', 'description'], value || undefined)
    },
  })

  const purpose = computed({
    get () {
      return get(manifest.value, ['spec', 'purpose'])
    },
    set (value) {
      set(manifest.value, ['spec', 'purpose'], value || undefined)
    },
  })

  /* projectShootCustomFields */
  const {
    shootCustomFields,
    rawShootCustomFields,
    addShootCustomField,
    deleteShootCustomField,
    replaceShootCustomField,
    isShootCustomFieldNameUnique,
    getShootCustomFieldsPatchDocument,
    getCustomFieldByKey,
    generateKeyFromName,
  } = useProjectShootCustomFields(manifest)

  /* costObject */
  const {
    costObject,
    costObjectType,
    getCostObjectPatchDocument,
  } = useProjectCostObject(manifest, { projectMetadataComposable })

  return {
    /* manifest */
    projectManifest: normalizedManifest,
    setProjectManifest,
    createProjectManifest,
    isProjectDirty,
    /* metadata */
    projectName,
    projectTitle,
    isNewProject,
    getProjectAnnotation,
    setProjectAnnotation,
    unsetProjectAnnotation,
    /* spec */
    description,
    purpose,
    /* projectShootCustomFields */
    shootCustomFields,
    rawShootCustomFields,
    addShootCustomField,
    deleteShootCustomField,
    replaceShootCustomField,
    isShootCustomFieldNameUnique,
    getShootCustomFieldsPatchDocument,
    getCustomFieldByKey,
    generateKeyFromName,
    /* costObject */
    costObject,
    costObjectType,
    getCostObjectPatchDocument,
  }
}

export function useProjectContext () {
  return inject('project-context', null)
}

export function useProvideProjectContext (options) {
  const composable = createProjectContextComposable(options)
  provide('project-context', composable)
  return composable
}
