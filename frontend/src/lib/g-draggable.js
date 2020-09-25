// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0

import get from 'lodash/get'
import set from 'lodash/set'
import forEach from 'lodash/forEach'

export const ATTRIBUTE_DRAG_AND_DROP_ID = 'data-g-id'

const DragAndDropEventsEnum = {
  DRAG_START: 'dragStart',
  DRAG_END: 'dragEnd',
  DRAG_ENTER: 'dragEnter',
  DRAG_OVER: 'dragOver',
  DRAG_LEAVE: 'dragLeave',
  DROPPED: 'dropped'
}

const initialDragState = {
  offsetX: 0,
  offsetY: 0,
  startX: 0,
  startY: 0,
  baseLeft: 0,
  baseTop: 0,
  source: undefined,
  clone: undefined,
  appendClone: false,
  mouseOverId: undefined,
  mouseOverDropzoneId: undefined,
  anyDroppableBelow: undefined,
  sourceDragAndDropId: undefined,
  animation: undefined,
  disposables: []
}
const dragState = {}
Object.assign(dragState, initialDragState)

/* Event listeners */

function mousedown (event, el, binding) {
  stopInputEvents(event)

  const ignore = event.srcElement.closest('.g-ignore-drag')
  if (ignore) {
    return
  }

  const rect = el.getBoundingClientRect()
  const clone = dragState.clone = el.cloneNode(true)
  clone.style.position = 'absolute'
  clone.style.height = rect.height + 'px'
  clone.style.width = rect.width + 'px'
  clone.style.left = rect.left + 'px'
  clone.style.top = rect.top + 'px'
  clone.style.opacity = '0.5'

  dragState.offsetX = event.clientX - rect.left
  dragState.offsetY = event.clientY - rect.top
  dragState.baseLeft = rect.left
  dragState.baseTop = rect.top
  dragState.startX = event.clientX
  dragState.startY = event.clientY
  dragState.source = el
  dragState.sourceDragAndDropId = el.getAttribute(ATTRIBUTE_DRAG_AND_DROP_ID)
  dragState.appendClone = true

  set(binding, 'value.dragging', true)

  dragState.source.dispatchEvent(new CustomEvent(DragAndDropEventsEnum.DRAG_START))
  addEventListeners(binding)
}

function mouseup (event, binding) {
  stopInputEvents(event)

  // ignore if left mouse button is not released
  if (event.button !== 0) {
    return
  }

  set(binding, 'value.dragging', false)

  dispose()

  const cloneAppended = !dragState.appendClone
  if (cloneAppended) {
    document.documentElement.removeChild(dragState.clone)
  }

  dispatchEvent(binding, dragState, event, DragAndDropEventsEnum.DROPPED)
  dragState.source.dispatchEvent(new CustomEvent(DragAndDropEventsEnum.DRAG_END))

  Object.assign(dragState, initialDragState)
}

function mousemove (event, binding) {
  stopInputEvents(event)

  if (dragState.appendClone) {
    document.documentElement.appendChild(dragState.clone)
    dragState.appendClone = false
  }

  dragState.clone.style.left = `${dragState.baseLeft + event.clientX - dragState.startX}px`
  dragState.clone.style.top = `${dragState.baseTop + event.clientY - dragState.startY}px`

  dragState.clone.hidden = true
  dispatchEvent(binding, dragState, event, DragAndDropEventsEnum.DRAG_OVER)
  dragState.clone.hidden = false
}

function keydown (event, binding) {
  stopInputEvents(event)

  if (event.keyCode === 27) { // Esc key
    cancelDrag(binding)
  }
}

/* Utility functions */

function cancelDrag (binding) {
  const event = createMouseEvent('mouseup', -1, -1)
  mouseup(event, binding)
}

function createMouseEvent (type, clientX, clientY) {
  const event = document.createEvent('MouseEvent')
  event.initMouseEvent(type, true, true, window, 0, 0, 0,
    clientX, clientY, false, false, false, false, 0, null)
  return event
}

function dispatchDragLeaveEventToListeners ({ mouseOverId, mouseOverDropzoneId, listeners, source, animation }, binding) {
  const customEventInit = getCustomEventInit({ mouseOverId, mouseOverDropzoneId, source, binding })
  dispatchEventToListeners(listeners, new CustomEvent(DragAndDropEventsEnum.DRAG_LEAVE, customEventInit))

  if (animation) {
    animation.reverse()
  }
}

function dispatchEventToListeners (list, event) {
  forEach(list, listener => {
    if (!listener) {
      return
    }
    listener.dispatchEvent(event)
  })
}

// see https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent for customEventInit
function getCustomEventInit ({ mouseOverId, mouseOverDropzoneId, source, binding }) {
  return {
    detail: {
      mouseOverId,
      mouseOverDropzoneId,
      sourceElementDropzoneId: source.getAttribute(ATTRIBUTE_DRAG_AND_DROP_ID),
      arg: binding.arg,
      modifiers: binding.modifiers
    }
  }
}

function droppableListeners (elemBelow, listeners = []) {
  if (!elemBelow) {
    return listeners
  }
  const listener = elemBelow.closest('.g-droppable-listener')
  if (!listener) {
    return listeners
  }
  listeners.push(listener)
  return droppableListeners(listener.parentElement, listeners) // recursion
}

function dispatchEvent (binding, dragState, event, eventType) {
  const elemBelow = document.elementFromPoint(event.clientX, event.clientY)
  if (!elemBelow) {
    dispatchDragLeaveEventToListeners(dragState, binding)
    return
  }
  const listeners = droppableListeners(elemBelow)
  const droppableZoneBelow = elemBelow.closest('.g-droppable-zone')
  const droppableBelow = elemBelow.closest('.g-droppable')
  const anyDroppableBelow = droppableBelow || droppableZoneBelow
  listeners.push(droppableZoneBelow, droppableBelow)

  let mouseOverId
  let mouseOverDropzoneId
  if (!anyDroppableBelow) {
    mouseOverId = undefined
    mouseOverDropzoneId = undefined
  } else {
    mouseOverId = anyDroppableBelow.id
    mouseOverDropzoneId = anyDroppableBelow.getAttribute(ATTRIBUTE_DRAG_AND_DROP_ID)
  }
  const customEventInit = getCustomEventInit({
    mouseOverId,
    mouseOverDropzoneId,
    source: dragState.source,
    binding
  })

  const mouseOverOtherDropzone = !!mouseOverDropzoneId && mouseOverDropzoneId !== dragState.sourceDragAndDropId
  const dragEnterDifferentEl = mouseOverDropzoneId !== dragState.mouseOverDropzoneId
  const dragLeave = (!mouseOverDropzoneId && dragState.mouseOverDropzoneId) || dragEnterDifferentEl
  const dragEnter = mouseOverOtherDropzone && ((mouseOverDropzoneId && !dragState.mouseOverDropzoneId) || dragEnterDifferentEl)
  if (dragLeave) {
    dispatchDragLeaveEventToListeners(dragState, binding)
  }
  if (dragEnter) {
    dispatchEventToListeners(listeners, new CustomEvent(DragAndDropEventsEnum.DRAG_ENTER, customEventInit))

    dragState.clone.style['transform-origin'] = `${dragState.offsetX}px ${dragState.offsetY}px`

    if (dragState.animation) {
      dragState.animation.cancel()
    }
    if (dragState.clone.animate) { // animate not supported by safari
      dragState.animation = dragState.clone.animate({
        transform: ['scale(1)', 'scale(0.3)']
      }, {
        easing: 'ease-in-out',
        fill: 'forwards',
        duration: 150
      })
    }
  }
  dragState.anyDroppableBelow = anyDroppableBelow
  dragState.listeners = listeners
  dragState.mouseOverId = mouseOverId
  dragState.mouseOverDropzoneId = mouseOverDropzoneId

  dispatchEventToListeners(listeners, new CustomEvent(eventType, customEventInit))
}

function addEventListeners (binding) {
  const el = document.documentElement
  dragState.disposables.push(addElementEventListener(el, 'mousemove', event => mousemove(event, binding), true))
  dragState.disposables.push(addElementEventListener(el, 'mouseup', event => mouseup(event, binding), true))
  dragState.disposables.push(addElementEventListener(el, 'keydown', event => keydown(event, binding), true))
  dragState.disposables.push(addElementEventListener(el, 'mouseenter', stopInputEvents, true))
  dragState.disposables.push(addElementEventListener(el, 'mouseleave', stopInputEvents, true))
  dragState.disposables.push(addElementEventListener(el, 'mouseover', stopInputEvents, true))
  dragState.disposables.push(addElementEventListener(el, 'mouseout', stopInputEvents, true))
  dragState.disposables.push(addElementEventListener(el, 'keyup', stopInputEvents, true))
  dragState.disposables.push(addElementEventListener(el, 'keypress', stopInputEvents, true))
  dragState.disposables.push(addElementEventListener(el, 'contextmenu', stopInputEvents, true))
}

function addElementEventListener (el, type, handler, useCapture) {
  if (el) {
    el.addEventListener(type, handler, useCapture)
  }
  return {
    dispose: () => {
      if (!handler || !el) {
        // Already disposed
        return
      }
      el.removeEventListener(type, handler, useCapture)
    }
  }
}

function dispose () {
  dragState.disposables.forEach(d => d.dispose())
}

function stopInputEvents (event) {
  event.preventDefault()
  event.stopPropagation()
}

/* Draggable Directive https://vuejs.org/v2/guide/custom-directive.html */
export const gDraggable = {
  bind (el, binding, vnode) {
    gDraggable.update(el, binding, vnode)
  },
  update (el, binding, vnode) {
    const handler = get(binding, 'value.handle.$el') || get(binding, 'value.handle') || el
    if (!handler.getAttribute('draggable')) {
      el.removeEventListener('mousedown', el._listener)
      const eventListener = event => mousedown(event, el, binding)
      handler.addEventListener('mousedown', eventListener)
      el._listener = eventListener

      handler.setAttribute('draggable', 'true')
    }
  },
  unbind () {
    dispose()
  }
}
