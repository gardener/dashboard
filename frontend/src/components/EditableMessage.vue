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
    <template v-if="!msg.type">
      {{msg.text}}
    </template>
    <v-alert
      v-else
      @input="onInput"
      text dense
      dismissible
      close-label="Dismiss error"
      border="left"
      color="error"
      class="pl-2 mb-1"
    >
      <v-row
        no-gutters
        align="center"
        class="alert-expansion-panel"
        :class="{ 'alert-expansion-panel--active': expanded }"
      >
        <v-col class="shrink">
          <v-btn icon small color="error" @click="expanded = !expanded">
            <v-icon size="18">expand_more</v-icon>
          </v-btn>
        </v-col>
        <v-col class="grow alert-title" @click="expanded = !expanded">
          {{msg.text}}
        </v-col>
      </v-row>
      <v-row v-if="expanded" no-gutters align="center">
        <v-col class="alert-subtitle">
          {{msg.description}}
        </v-col>
      </v-row>
    </v-alert>
  </div>
</template>

<script>
export default {
  name: 'editable-message',
  props: {
    message: {
      type: String,
      required: true
    }
  },
  data () {
    return {
      expanded: false
    }
  },
  computed: {
    msg () {
      try {
        const [text, description] = JSON.parse(this.message)
        return { type: 1, text, description }
      } catch (err) { /* ignore error */ }
      return { type: 0, text: this.message }
    }
  },
  methods: {
    onInput (value) {
      if (!value) {
        this.$emit('close')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
  .alert-expansion-panel {
    &--active .v-icon {
      transform: rotate(-180deg)
    }
  }
  .alert-title {
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
  }
  .alert-subtitle {
    padding-top: 2px;
    font-size: 14px;
    font-family: monospace;
    margin-left: 28px;
  }
</style>
