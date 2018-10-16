<!--
Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
  <span v-if="labels.length">
    <span v-for="label in labels" :key="label.id" class="label-color" :style="labelStyle(label)">
      {{ label.name }}
    </span>
  </span>

</template>

<script>
import contrast from 'get-contrast'
import get from 'lodash/get'

export default {
  props: {
    labels: {
      type: Array,
      required: true
    }
  },
  computed: {
    labelStyle () {
      return (label) => {
        const bgColor = `#${get(label, 'color')}`
        const textColor = contrast.isAccessible(bgColor, '#fff') ? '#fff' : '#000'
        return `background-color: ${bgColor}; color: ${textColor};`
      }
    }
  }
}
</script>

<style lang="styl" scoped>

  .label-color {
      margin-left: 4px;
      padding: 2px 4px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 2px;
      box-shadow: inset 0 -1px 0 rgba(27,31,35,0.12);
  }

</style>
