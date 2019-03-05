<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

<template>
  <div>
    <v-avatar :size="size">
      <img :src="avatarUrl"/>
    </v-avatar>
    <a v-if="mailTo && isEmail" :href="`mailto:${accountName}`" class="pl-2 cyan--text text--darken-2">{{accountName}}</a>
    <span v-else class="pl-2">{{accountName}}</span>
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
