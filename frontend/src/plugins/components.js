//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import GList from '@/components/GList.vue'
import GListItem from '@/components/GListItem.vue'
import GListItemContent from '@/components/GListItemContent.vue'
import GToolbar from '@/components/GToolbar.vue'
import GActionButton from '@/components/GActionButton.vue'
import GExternalLink from '@/components/GExternalLink.vue'
import GTimeString from '@/components/GTimeString.vue'
import GPopover from '@/components/floating/GPopover.vue'

export default {
  install (app) {
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
