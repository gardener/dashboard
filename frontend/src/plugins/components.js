//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  VTooltip,
  VClosePopper,
  Dropdown,
  Tooltip,
  Menu,
  PopperWrapper,
  options,
} from 'floating-vue'

import 'floating-vue/dist/style.css'

import GList from '@/components/GList.vue'
import GListItem from '@/components/GListItem.vue'
import GListItemContent from '@/components/GListItemContent.vue'
import GToolbar from '@/components/GToolbar.vue'
import GPopover from '@/components/GPopover.vue'
import GActionButton from '@/components/GActionButton.vue'
import GExternalLink from '@/components/GExternalLink.vue'
import GTimeString from '@/components/GTimeString.vue'

const Popover = {
  ...PopperWrapper,
  name: 'VPopover',
  vPopperTheme: 'popover',
}

export default {
  install (app) {
    // floating directives
    app.directive('tooltip', VTooltip)
    app.directive('close-popper', VClosePopper)
    // floating components
    app.component('VDropdown', Dropdown)
    app.component('VTooltip', Tooltip)
    app.component('VMenu', Menu)
    app.component('VPopover', Popover)
    // floating themes
    options.themes.popover = {
      $extend: 'dropdown',
      placement: 'bottom',
    }
    // gardener components
    app.component('GList', GList)
    app.component('GListItem', GListItem)
    app.component('GListItemContent', GListItemContent)
    app.component('GToolbar', GToolbar)
    app.component('GActionButton', GActionButton)
    app.component('GExternalLink', GExternalLink)
    app.component('GTimeString', GTimeString)
    app.component('GPopover', GPopover)
  },
}
