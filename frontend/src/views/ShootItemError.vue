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
        <p class="message">{{message}}</p>
        <v-btn dark color="cyan darken-2" @click="goBack">{{buttonText}}</v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import get from 'lodash/get'

export default {
  props: {
    code: {
      type: [String, Number],
      default: '404'
    },
    text: {
      type: String,
      default: 'Cluster not found'
    },
    message: {
      type: String,
      default: 'The cluster you are looking for doesn\'t exist or an other error occured!'
    },
    buttonText: {
      type: String,
      default: 'Back to cluster list'
    }
  },
  methods: {
    goBack (fallback) {
      const namespace = get(this.$route, 'params.namespace', this.$store.state.namespace)
      this.$router.push({
        name: 'ShootList',
        params: {
          namespace
        }
      })
    }
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
  .message {
    margin-bottom: 50px;
  }
</style>
