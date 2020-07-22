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
  <v-container
    class="text-center fill-height">
    <v-row align="center">
      <v-col>
        <h1>404</h1>
        <h2>Looks like you're lost</h2>
        <p class="message">The page you are looking for is not available!</p>
        <v-btn dark color="cyan darken-2" @click="goBack">
          Get me out of here
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import get from 'lodash/get'
import includes from 'lodash/includes'
import head from 'lodash/head'

export default {
  name: 'not-found',
  data () {
    return {
      fromRoute: undefined
    }
  },
  computed: {
    ...mapState([
      'namespace'
    ]),
    ...mapGetters([
      'namespaces'
    ]),
    defaultNamespace () {
      return this.namespace || includes(this.namespaces, 'garden') ? 'garden' : head(this.namespaces)
    },
    fallback () {
      const namespace = get(this.$route, 'params.namespace', this.defaultNamespace)
      const name = get(this.$route, 'params.name')
      if (namespace) {
        if (name) {
          return {
            name: 'ShootItem',
            params: {
              namespace,
              name
            }
          }
        }
        return {
          name: 'ShootList',
          params: {
            namespace
          }
        }
      }
      return {
        name: 'Home'
      }
    }
  },
  methods: {
    goBack (fallback) {
      if (!get(this, 'fromRoute.name')) {
        this.$router.push(this.fallback)
      } else {
        this.$router.back()
      }
    }
  },
  beforeRouteEnter (to, from, next) {
    console.log(to)
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
