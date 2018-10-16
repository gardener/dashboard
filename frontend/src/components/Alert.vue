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
  <v-alert :color="color" dismissible v-model="alertVisible">
    <div class="subheading">
      {{message}}
      <v-btn dark outline small v-if="!!detailedMessage" @click="detailedMessageVisible = !detailedMessageVisible">
        Details
      </v-btn>
    </div>
    <transition name="fade">
      <div v-if="!!detailedMessageVisible">
        <code>{{detailedMessage}}</code>
      </div>
    </transition>
  </v-alert>
</template>

<script>
export default {
  name: 'alert',
  props: {
    message: {
      type: String
    },
    detailedMessage: {
      type: String
    },
    color: {
      type: String,
      required: true
    }
  },
  data () {
    return {
      detailedMessageVisible: false
    }
  },
  computed: {
    alertVisible: {
      get () {
        return !!this.message
      },
      set (value) {
        if (!value) {
          this.$emit('update:message', undefined)
          this.$emit('update:detailedMessage', undefined)
        }
      }
    }
  }
}
</script>

<style lang="styl" scoped>
  .fade-enter-active, .fade-leave-active {
    transition: opacity .5s;
  }
  .fade-enter, .fade-leave-to /* .fade-leave-active below version 2.1.8 */ {
    opacity: 0;
  }
</style>
