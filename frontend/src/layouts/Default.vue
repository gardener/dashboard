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
  <v-app>
    <loading></loading>
    <main-navigation></main-navigation>
    <main-toolbar></main-toolbar>
    <v-content>
      <v-alert :type="alertType" v-model="alertVisible" dismissible>
        <div class="alertMessage" v-html="alertMessageCompiledMarkdown"></div>
      </v-alert>
      <router-view></router-view>
    </v-content>
    <v-snackbar color="error" fixed bottom v-model="errorVisible">
      <div class="white-text">{{errorMessage}} </div>
      <v-spacer/>
      <v-btn icon class="white--text" @click.native.stop="setError(null)">
        <v-icon>close</v-icon>
      </v-btn>
    </v-snackbar>
    <v-snackbar :timeout.number="2000" color="success" v-model="snackbar">
      {{message}}
    </v-snackbar>
  </v-app>
</template>

<script>
  import MainNavigation from '@/components/MainNavigation.vue'
  import MainToolbar from '@/components/MainToolbar.vue'
  import Loading from '@/components/Loading.vue'
  import { mapGetters, mapActions } from 'vuex'
  import marked from 'marked'

  export default {
    name: 'Default',
    components: {
      MainNavigation,
      MainToolbar,
      Loading
    },
    data () {
      return {
        snackbar: false,
        message: ''
      }
    },
    computed: {
      ...mapGetters([
        'errorMessage',
        'alertMessage',
        'alertType'
      ]),
      errorVisible: {
        get () {
          return !!this.errorMessage
        },
        set (value) {
          if (!value) {
            this.setError(null)
          }
        }
      },
      alertVisible: {
        get () {
          return !!this.alertMessage
        },
        set (value) {
          if (!value) {
            this.setAlert(null)
          }
        }
      },
      alertMessageCompiledMarkdown () {
        const options = {
          gfm: true,
          breaks: true,
          tables: true,
          sanitize: true
        }
        return marked(this.alertMessage, options)
      }
    },
    methods: {
      ...mapActions([
        'setError',
        'setAlert'
      ])
    },
    created () {
      // Global event handler to show a toast message. you can show a toast from any component
      this.$bus.$on('toast', msg => {
        this.message = msg
        this.snackbar = true
      })
    }
  }
</script>

<style lang="styl">
  .alertMessage {
    a {
      color: white !important;
    }
  }
</style>
