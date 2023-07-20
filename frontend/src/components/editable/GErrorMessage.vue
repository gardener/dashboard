<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div v-if="!msg.isAlert">
    {{ msg.text }}
  </div>
  <v-alert
    v-else
    variant="tonal"
    density="compact"
    closable
    close-label="Dismiss error"
    close-icon="mdi-close"
    border="start"
    color="error"
    :icon="false"
    class="pl-2 mb-2"
    @update:model-value="onUpdateModelValue"
  >
    <v-row
      no-gutters
      align="center"
      class="alert-expansion-panel"
      :class="{ 'alert-expansion-panel--active': expanded }"
    >
      <v-col>
        <v-btn
          color="error"
          icon="mdi-chevron-down"
          variant="text"
          density="comfortable"
          @click="expanded = !expanded"
        />
      </v-col>
      <v-col
        class="alert-title cursor-pointer"
        @click="expanded = !expanded"
      >
        {{ msg.text }}
      </v-col>
    </v-row>
    <v-row
      v-if="expanded"
      no-gutters
      align="center"
    >
      <v-col class="alert-subtitle">
        {{ msg.description }}
      </v-col>
    </v-row>
  </v-alert>
</template>

<script>
export default {
  props: {
    message: {
      type: String,
      required: true,
    },
  },
  emits: [
    'close',
  ],
  data () {
    return {
      expanded: false,
    }
  },
  computed: {
    msg () {
      try {
        const [text, description] = JSON.parse(this.message)
        return { isAlert: true, text, description }
      } catch (err) { /* ignore error */ }
      return { isAlert: false, text: this.message }
    },
  },
  methods: {
    onUpdateModelValue (value) {
      if (!value) {
        this.$emit('close')
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.alert-expansion-panel {
  div:first-child {
    flex-grow: 0;
  }
  &--active .v-icon {
    transform: rotate(-180deg)
  }
}

.alert-title {
  flex-grow: 1;
  font-size: 14px;
  font-weight: 500;
}

.alert-subtitle {
  flex-grow: 1;
  padding-top: 2px;
  font-size: 14px;
  font-family: monospace;
  margin-left: 28px;
}
</style>
