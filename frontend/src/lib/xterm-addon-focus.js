//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { toRef } from 'vue'

import { useAppStore } from '@/store/app'

const store = useAppStore()

const focusedElementId = toRef(store, 'focusedElementId')

export class FocusAddon {
  constructor (uuid) {
    this.uuid = uuid
  }

  activate (terminal) {
    terminal.textarea.onfocus = () => {
      focusedElementId.value = this.uuid
    }
    terminal.textarea.onblur = () => {
      if (focusedElementId.value === this.uuid) {
        focusedElementId.value = null
      }
    }
  }

  dispose () {}
}
