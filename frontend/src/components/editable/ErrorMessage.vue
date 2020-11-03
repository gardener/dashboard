<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <div>
    <template v-if="!msg.isAlert">
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
            <v-icon size="18">mdi-chevron-down</v-icon>
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
        return { isAlert: true, text, description }
      } catch (err) { /* ignore error */ }
      return { isAlert: false, text: this.message }
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
