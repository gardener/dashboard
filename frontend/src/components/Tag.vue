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
  <span>
    <template v-if="message">
      <g-popper :title="title" :message="message" :toolbarColor="color" :time="time" :popperKey="popperKey" :placement="popperPlacement">
        <v-chip class="cursor-pointer" slot="popperRef" outline :text-color="chipTextColor" small :color="color">
          {{chipText}}
        </v-chip>
      </g-popper>
    </template>
    <template v-else>
      <v-chip slot="popperRef" outline :text-color="chipTextColor" small :color="color">
        {{chipText}}
      </v-chip>
    </template>
  </span>
</template>

<script>
import GPopper from '@/components/GPopper'

export default {
  components: {
    GPopper
  },
  props: {
    chipText: {
      type: String,
      required: true
    },
    isError: {
      type: Boolean,
      required: true
    },
    isUnknown: {
      type: Boolean,
      required: false
    },
    title: {
      type: String
    },
    message: {
      type: String
    },
    time: {
      type: String
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
    color () {
      if (this.isError) {
        return 'red'
      }
      if (this.isUnknown) {
        return 'grey lighten-1'
      }
      return 'cyan darken-2'
    },
    chipTextColor () {
      if (this.isError) {
        return 'red'
      }
      if (this.isUnknown) {
        return 'grey lighten-1'
      }
      return 'cyan darken-2'
    }
  }
}
</script>

<style lang="styl" scoped>

  .cursor-pointer >>> .chip__content {
    cursor: pointer;
  }

</style>
