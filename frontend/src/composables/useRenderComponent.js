//
// SPDX-FileCopyrightText: Copyright Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  createVNode,
  render,
} from 'vue'

export const useRenderComponent = () => {
  return (name, props) => {
    const vNode = createVNode(name, props)
    const element = document.createElement('div')
    render(vNode, element)
    return element
  }
}
