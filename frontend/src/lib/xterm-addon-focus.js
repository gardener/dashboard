//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { toRef } from 'vue'

import { useAppStore } from '@/store'

const store = useAppStore()

const focusedElementId = toRef(store, 'focusedElementId')

export class FocusAddon {
  constructor (uuid, store) {
    this.uuid = uuid
    this.store = store
  }

  activate (terminal) {
    terminal.textarea.onfocus = () => {
      focusedElementId.value = this.uuid
      if (typeof this.onFocus === 'function') {
        this.onFocus()
      }
    }
    terminal.textarea.onblur = () => {
      if (focusedElementId.value === this.uuid) {
        focusedElementId.value = null
      }
      if (typeof this.onBlur === 'function') {
        this.onBlur()
      }
    }
  }

  dispose () {}
}
