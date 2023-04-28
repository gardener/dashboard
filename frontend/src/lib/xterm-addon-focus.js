//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export class FocusAddon {
  constructor (uuid, store) {
    this.uuid = uuid
    this.store = store
  }

  activate (terminal) {
    terminal.textarea.onfocus = () => {
      this.store.commit('SET_FOCUSED_ELEMENT_ID', this.uuid)
      if (typeof this.onFocus === 'function') {
        this.onFocus()
      }
    }
    terminal.textarea.onblur = () => {
      this.store.commit('UNSET_FOCUSED_ELEMENT_ID', this.uuid)
      if (typeof this.onBlur === 'function') {
        this.onBlur()
      }
    }
  }

  dispose () {}
}
