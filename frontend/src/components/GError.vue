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
  <v-container fluid class="fill-height text-center">
    <v-row align="center">
      <v-col>
        <h1>{{code}}</h1>
        <h2>{{text}}</h2>
        <p v-if="message">{{message}}</p>
        <v-btn dark color="cyan darken-2" @click="onClick" class="mt-12">{{buttonText}}</v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  props: {
    code: {
      type: [String, Number],
      default: '500'
    },
    text: {
      type: String,
      default: 'Unexpected Error :('
    },
    message: {
      type: String
    },
    buttonText: {
      type: String,
      default: 'Get me out of here'
    }
  },
  data () {
    return {
      fromRoute: undefined
    }
  },
  methods: {
    onClick () {
      this.$emit('click', this.fromRoute)
    }
  },
  beforeRouteEnter (to, from, next) {
    next(vm => {
      vm.fromRoute = from
    })
  }
}
</script>

<style lang="scss" scoped>
  h1 {
    font-size: 160px;
    line-height: 160px;
    font-weight: bold;
    color: #515151;
    margin-bottom: 0;
  }
  h2 {
    font-size: 36px;
    font-weight: 300;
    color: #999999;
  }
</style>
