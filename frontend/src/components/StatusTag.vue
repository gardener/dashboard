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
  <tag :chipText="chipTextShortened" :isError="isError" :isUnknown="isUnknown" :title="chipText" :message="tag.message" :time="tag.lastTransitionTime" :popperKey="popperKeyWithType" :popperPlacement="popperPlacement"></tag>
</template>

<script>
import split from 'lodash/split'
import Tag from '@/components/Tag'
import replace from 'lodash/replace'

export default {
  components: {
    Tag
  },
  props: {
    condition: {
      type: Object,
      required: true
    },
    popperKey: {
      type: String,
      required: true
    },
    popperPlacement: {
      type: String
    }
  },
  computed: {
    chipText () {
      return this.tag.text || ''
    },
    chipTextShortened () {
      if (this.$vuetify.breakpoint.mdAndDown) {
        return this.chipText.charAt(0)
      }
      if (this.$vuetify.breakpoint.lgOnly) {
        return split(this.chipText, ' ').shift()
      }
      if (this.$vuetify.breakpoint.xlOnly) {
        return this.chipText
      }
    },
    isError () {
      switch (this.tag.status) {
        case 'True':
          return false
        case 'False':
          return true
        default:
          return false
      }
    },
    isUnknown () {
      switch (this.tag.status) {
        case 'Unknown':
          return true
        default:
          return false
      }
    },
    popperKeyWithType () {
      return `statusTag_${this.popperKey}`
    },
    tag () {
      const { lastTransitionTime, message, status, type } = this.condition
      const id = type
      let text = replace(type, /([a-z])([A-Z])/g, '$1 $2')
      switch (type) {
        case 'ControlPlaneHealthy':
          text = 'Control Plane'
          break
        case 'SystemComponentsHealthy':
          text = 'System Components'
          break
        case 'EveryNodeReady':
          text = 'Nodes'
          break
      }
      return { id, text, message, lastTransitionTime, status }
    }
  }
}
</script>
