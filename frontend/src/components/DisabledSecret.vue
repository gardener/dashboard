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
  <v-card class="mr-extra card_disabled">
    <v-toolbar :class="toolbarClass" dark>
      <infra-icon v-model="icon" :width="32"></infra-icon>
      <v-toolbar-title>{{infrastructureName}}</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn disabled icon>
        <v-icon class="white--text">add</v-icon>
      </v-btn>
      <v-btn disabled icon>
        <v-icon class="white--text">mdi-help-circle-outline</v-icon>
      </v-btn>
    </v-toolbar>
    <div class="description_container">
      <div class="description mt-3">
        {{description}}
      </div>
    </div>
  </v-card>
</template>

<script>
import InfraIcon from '@/components/VendorIcon'

export default {
  components: {
    InfraIcon
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

<style lang="styl" scoped>
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
