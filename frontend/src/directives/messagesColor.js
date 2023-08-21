//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export function messagesColor (el, binding) {
  const messagesElement = el.querySelector('.v-messages')
  if (!messagesElement) {
    return
  }
  const { color = 'default' } = binding.value

  const rgbValue = !el.classList.contains('v-input--error')
    ? getComputedStyle(el).getPropertyValue(`--v-theme-${color}`)
    : ''
  messagesElement.style.color = rgbValue
    ? `rgb(${rgbValue})`
    : ''
}
