// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0

import store from '../store'

export class FocusAddon {
  constructor (uuid) {
    this.uuid = uuid
  }

  activate (terminal) {
    terminal.textarea.onfocus = () => {
      store.commit('SET_FOCUSED_ELEMENT_ID', this.uuid)
      if (typeof this.onFocus === 'function') {
        this.onFocus()
      }
    }
    terminal.textarea.onblur = () => {
      store.commit('UNSET_FOCUSED_ELEMENT_ID', this.uuid)
      if (typeof this.onBlur === 'function') {
        this.onBlur()
      }
    }
  }

  dispose () {}
}
