<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="nowrap">
    <v-avatar :size="size">
      <img :src="avatarUrl" :alt="`avatar of ${accountName}`"/>
    </v-avatar>
    <a v-if="mailTo && isEmail" :href="`mailto:${accountName}`" class="pl-2">{{accountName}}</a>
    <span v-else-if="accountName" class="pl-2">{{accountName}}</span>
    <span v-else class="pl-2 font-weight-light text--disabled">Unknown</span>
  </div>
</template>

<script>
import { gravatarUrlGeneric, isEmail } from '@/utils'

export default {
  props: {
    accountName: {
      type: String,
      default: ''
    },
    mailTo: {
      type: Boolean,
      default: false
    },
    size: {
      type: Number,
      default: 24
    }
  },
  computed: {
    avatarUrl () {
      return gravatarUrlGeneric(this.accountName, this.size * 2)
    },
    isEmail () {
      return isEmail(this.accountName)
    }
  }
}
</script>
