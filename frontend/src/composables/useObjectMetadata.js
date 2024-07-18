//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'

import utils from '@/utils'

import {
  get,
  set,
  unset,
} from '@/lodash'

export const useAnnotations = object => {
  const annotations = computed(() => {
    return get(object.value, 'metadata.annotations', {})
  })

  function getAnnotation (key, defaultValue) {
    return get(object.value, `metadata.annotations['${key}']`, defaultValue)
  }

  function setAnnotation (key, value) {
    set(object.value, `metadata.annotations['${key}']`, value)
  }

  function unsetAnnotation (key) {
    unset(object.value, `metadata.annotations['${key}']`)
  }

  return {
    annotations,
    getAnnotation,
    setAnnotation,
    unsetAnnotation,
  }
}

export const useLabels = object => {
  const labels = computed(() => {
    return get(object.value, 'metadata.labels', {})
  })

  function getLabel (key, defaultValue) {
    return get(object.value, `metadata.labels['${key}']`, defaultValue)
  }

  function setLabel (key, value) {
    set(object.value, `metadata.labels['${key}']`, value)
  }

  function unsetLabel (key) {
    unset(object.value, `metadata.labels['${key}']`)
  }

  return {
    labels,
    getLabel,
    setLabel,
    unsetLabel,
  }
}

export const useObjectMetadata = object => {
  const name = computed({
    get () {
      return get(object.value, 'metadata.name')
    },
    set (value) {
      set(object.value, 'metadata.name', value)
    },
  })

  const namespace = computed(() => {
    return get(object.value, 'metadata.namespace')
  })

  const creationTimestamp = computed(() => {
    return get(object.value, 'metadata.creationTimestamp')
  })

  const deletionTimestamp = computed(() => {
    return get(object.value, 'metadata.deletionTimestamp')
  })

  const generation = computed(() => {
    return get(object.value, 'metadata.generation')
  })

  const uid = computed(() => {
    return get(object.value, 'metadata.uid')
  })

  const createdBy = computed(() => {
    return utils.getCreatedBy(metadata.value)
  })

  const createdAt = computed(() => {
    return utils.getTimestampFormatted(creationTimestamp.value)
  })

  const isNew = computed(() => {
    return !creationTimestamp.value
  })

  const metadata = computed(() => {
    return get(object.value, 'metadata', {})
  })

  return {
    namespace,
    name,
    creationTimestamp,
    deletionTimestamp,
    generation,
    uid,
    createdAt,
    createdBy,
    isNew,
    metadata,
    ...useAnnotations(object),
    ...useLabels(object),
  }
}
