<!--
Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
  <a :href="url" target="_blank" :class="textColor">
    <span :style="{ fontSize: size + 'px' }"><slot></slot></span><v-icon :size="size" :color="color">mdi-open-in-new</v-icon>
  </a>
</template>

<script>
import { textColorFromColor } from '@/utils'

export default {
  name: 'external-link',
  props: {
    url: {
      type: String
    },
    text: {
      type: String
    },
    size: {
      type: Number,
      default: 14
    },
    color: {
      type: String,
      default: 'cyan darken-2'
    }
  },
  computed: {
    textColor () {
      return textColorFromColor(this.color)
    }
  }
}
</script>

<style scoped>
  a {
    text-decoration: none;
  }
  a > span {
    text-decoration-line: underline;
  }
</style>
