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
  <div class="fill-height">
    <router-view v-if="!notFound"></router-view>
    <v-container v-else
      class="text-center fill-height">
      <v-row align="center">
        <v-col>
          <h1>404</h1>
          <h2>Cluster not found</h2>
          <p class="message">The cluster you are looking for doesn't exist or an other error occured!</p>
          <v-btn dark color="cyan darken-2" @click="goBack">
            Back to cluster list
          </v-btn>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script>
import get from 'lodash/get'

export default {
  name: 'shoot-placeholder',
  computed: {
    item () {
      return this.$store.getters.shootByNamespaceAndName(this.$route.params)
    },
    subscriptionErrorMessage () {
      return get(this.$store.state.shoots, 'subscriptionError.message')
    },
    notFound () {
      return !this.item && this.subscriptionErrorMessage === 'Failed to fetch cluster'
    },
    fallback () {
      const namespace = get(this.$route, 'params.namespace', this.$store.state.namespace)
      return {
        name: 'ShootList',
        params: {
          namespace
        }
      }
    }
  },
  methods: {
    goBack (fallback) {
      this.$router.push(this.fallback)
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
