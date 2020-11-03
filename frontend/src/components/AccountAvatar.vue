<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <v-avatar :size="size">
      <img :src="avatarUrl"/>
    </v-avatar>
    <a v-if="mailTo && isEmail" :href="`mailto:${accountName}`" class="pl-2" :class="textColor">{{accountName}}</a>
    <span v-else class="pl-2">{{accountName || '-unknown-'}}</span>
  </div>
</template>

<script>
import { gravatarUrlGeneric, isEmail } from '@/utils'
import split from 'lodash/split'
import map from 'lodash/map'

export default {
  props: {
    accountName: {
      type: String,
      default: ''
    },
    color: {
      type: String,
      default: 'cyan darken-2'
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
    textColor () {
      const iteratee = value => /^(darken|lighten|accent)-\d$/.test(value) ? 'text--' + value : value + '--text'
      return map(split(this.color, ' '), iteratee)
    },
    avatarUrl () {
      return gravatarUrlGeneric(this.accountName, this.size * 2)
    },
    isEmail () {
      return isEmail(this.accountName)
    }
  }
}
</script>
