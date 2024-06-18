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

// TODO move cleanup to a shared helper
import { cleanup } from './useShootContext/helper'
import { useProjectShootCustomFields } from './useProjectShootCustomFields'
import { useProjectMetadata } from './useProjectMetadata'

import {
  cloneDeep,
  isEqual,
} from '@/lodash'

export function createProjectContextComposable (options = {}) {
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

  function createProjectManifest (options) {
    manifest.value = {}
    initialManifest.value = cloneDeep(normalizedManifest.value)
  }

  const isProjectDirty = computed(() => {
    return !isEqual(normalizedManifest.value, normalizedInitialManifest.value)
  })

  /* metadata */
  const {
    projectName,
    isNewProject,
    getProjectAnnotation,
    setProjectAnnotation,
    unsetProjectAnnotation,
  } = useProjectMetadata(manifest)

  /* projectShootCustomFields */
  const {
    shootCustomFields,
    rawShootCustomFields,
    addShootCustomField,
    deleteShootCustomField,
    replaceShootCustomField,
    isShootCustomFieldNameUnique,
    getShootCustomFieldsPatchData,
    getCustomFieldByKey,
    generateKeyFromName,
  } = useProjectShootCustomFields(manifest)

  return {
    /* manifest */
    projectManifest: normalizedManifest,
    setProjectManifest,
    createProjectManifest,
    isProjectDirty,
    /* metadata */
    projectName,
    isNewProject,
    getProjectAnnotation,
    setProjectAnnotation,
    unsetProjectAnnotation,
    /* projectShootCustomFields */
    shootCustomFields,
    rawShootCustomFields,
    addShootCustomField,
    deleteShootCustomField,
    replaceShootCustomField,
    isShootCustomFieldNameUnique,
    getShootCustomFieldsPatchData,
    getCustomFieldByKey,
    generateKeyFromName,
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
