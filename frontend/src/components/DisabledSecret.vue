<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-card class="card_disabled">
    <v-toolbar :class="toolbarClass">
      <vendor-icon v-model="icon" :width="32"></vendor-icon>
      <v-toolbar-title>{{infrastructureName}}</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn disabled icon>
        <v-icon class="white--text">mdi-plus</v-icon>
      </v-btn>
      <v-btn disabled icon>
        <v-icon class="white--text">mdi-help-circle-outline</v-icon>
      </v-btn>
    </v-toolbar>
    <div class="description_container">
      <div class="description mt-4">
        {{description}}
      </div>
    </div>
  </v-card>
</template>

<script>
import VendorIcon from '@/components/VendorIcon'

export default {
  components: {
    VendorIcon
  },
  props: {
    icon: {
      type: String,
      default: 'mdi-cloud-outline'
    },
    image: {
      type: String
    },
    infrastructureName: {
      type: String,
      required: true
    },
    color: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    }
  },
  computed: {
    toolbarClass () {
      return `${this.color} elevation-0`
    }
  }
}
</script>

<style lang="scss" scoped>
  .card_disabled {
    opacity:0.5;
  }

  .description_container {
    .description {
      padding: 30px;
      padding-top: 10px
    }
  }
</style>
