//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDraggableStore = defineStore('draggable', () => {
  const draggingDragAndDropId = ref()

  function setDraggingDragAndDropId (value) {
    draggingDragAndDropId.value = undefined
  }

  function $reset () {
    draggingDragAndDropId.value = null
  }

  return {
    draggingDragAndDropId,
    setDraggingDragAndDropId,
    $reset,
  }
})
