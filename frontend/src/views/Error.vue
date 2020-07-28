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
  <v-app>
    <v-main>
      <v-container class="text-center fill-height">
        <v-row align="center">
          <v-col>
            <h1>5XX</h1>
            <h2>Something unexpected happened</h2>
            <p class="message">{{ message }}</p>
            <v-btn dark color="cyan darken-2" @click="goBack">
              Get me out of here
            </v-btn>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import get from 'lodash/get'

export default {
  name: 'router-error',
  data () {
    return {
      fromRoute: undefined
    }
  },
  computed: {
    message () {
      return get(this.$store, 'alert.message')
    },
    type () {
      return get(this.$store, 'alert.type', 'Error').toUpperCase()
    }
  },
  methods: {
    goBack (fallback) {
      if (!get(this, 'fromRoute.name')) {
        this.$router.push({
          name: 'Home'
        })
      } else {
        this.$router.back()
      }
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
  .message {
    margin-bottom: 50px;
  }
</style>
