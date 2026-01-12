//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { reactive } from 'vue'

export function useProgrammaticTooltip ({
  openDelay = 0,
  location = 'top',
  transparentBackground = false,
  switchCloseDelay = 500,
} = {}) {
  const tooltip = reactive({
    visible: false,
    posX: 0,
    posY: 0,
    payload: null,
    openDelay,
    location,
    transparentBackground,
  })

  let openTimer = null
  let switchTimer = null

  let currentKey = null
  let pending = null

  function resolveAnchorEl (e, opts = {}) {
    const el = opts.el ?? e?.currentTarget ?? e?.target ?? null
    if (el && typeof el.getBoundingClientRect === 'function') {
      return el
    }
    return null
  }

  function setPosFromElement (el, location) {
    const r = el.getBoundingClientRect()

    switch (location) {
      case 'bottom':
        tooltip.posX = r.left + r.width / 2
        tooltip.posY = r.bottom
        break
      case 'left':
        tooltip.posX = r.left
        tooltip.posY = r.top + r.height / 2
        break
      case 'right':
        tooltip.posX = r.right
        tooltip.posY = r.top + r.height / 2
        break
      case 'top':
      default:
        tooltip.posX = r.left + r.width / 2
        tooltip.posY = r.top
    }
  }

  function scheduleOpen (delay) {
    clearTimeout(openTimer)
    if (delay > 0) {
      openTimer = setTimeout(() => { tooltip.visible = true }, delay)
    } else {
      tooltip.visible = true
    }
  }

  function applyShow (e, payload, opts = {}) {
    tooltip.location = opts.location ?? tooltip.location
    tooltip.openDelay = opts.openDelay ?? tooltip.openDelay
    tooltip.transparentBackground =
      opts.transparentBackground ?? tooltip.transparentBackground

    const anchorEl = resolveAnchorEl(e, opts)
    if (!anchorEl) {
      // If we cannot position, do not show (prevents crash + avoids weird overlay at 0,0)
      tooltip.visible = false
      tooltip.payload = null
      return
    }

    setPosFromElement(anchorEl, tooltip.location)

    tooltip.payload = payload
    scheduleOpen(tooltip.openDelay || 0)
  }

  function showTooltip (e, payload, opts = {}) {
    const key =
      opts.key ??
      payload?.metadata?.name ??
      payload?.id ??
      payload

    clearTimeout(openTimer)
    clearTimeout(switchTimer)

    // Switch A -> B: close first, then swap payload after a short delay
    if (currentKey !== null && currentKey !== key) {
      tooltip.visible = false

      pending = { e, payload, opts, key }

      switchTimer = setTimeout(() => {
        tooltip.payload = null
        currentKey = pending.key
        applyShow(pending.e, pending.payload, pending.opts)
        pending = null
      }, switchCloseDelay)

      return
    }

    // Normal show
    currentKey = key
    applyShow(e, payload, opts)
  }

  function hideTooltip () {
    clearTimeout(openTimer)
    clearTimeout(switchTimer)
    pending = null

    tooltip.visible = false
  }

  // Opts can contain el, location, openDelay, transparentBackground
  function bindTooltip (payload, opts = {}) {
    return {
      mouseenter: e => showTooltip(e, payload, opts),
      mouseleave: hideTooltip,
      focus: e => showTooltip(e, payload, opts),
      blur: hideTooltip,
    }
  }

  return {
    tooltip,
    bindTooltip,
    showTooltip,
    hideTooltip,
  }
}
