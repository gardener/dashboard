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
  <v-container fluid>

    <v-card class="mt-2">
      <v-snackbar :timeout="5000" top right v-model="showMessage">
        <div>Copied ID Token to clipboard!</div>
      </v-snackbar>
      <v-toolbar card class="teal darken-1" dark>
        <v-icon class="white--text pr-2">mdi-account</v-icon>
        <v-toolbar-title>User Details</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn
          ref="copy"
          icon
          class="mr-3"
          :data-clipboard-text="idToken"
        >
          <v-icon class="white--text">mdi-content-copy</v-icon>
        </v-btn>

      </v-toolbar>
      <v-card-text>
       <v-layout row wrap>
         <v-flex md4 xs12>
           <label class="caption grey--text text--darken-2">Name</label>
           <p class="subheading">{{username}}</p>
         </v-flex>
         <v-flex md8 xs12>
           <label class="caption grey--text text--darken-2">Email Address</label>
           <p class="subheading">{{email}}</p>
         </v-flex>
         <v-flex md6 xs12>
           <label class="caption grey--text text--darken-2">Session Expiration</label>
           <p class="subheading">{{expiresAt}}</p>
         </v-flex>
      </v-layout>
     </v-card-text>
   </v-card>
  </v-container>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import Clipboard from 'clipboard'
import moment from 'moment-timezone'

export default {
  name: 'profile',
  data () {
    return {
      floatingButton: false,
      showMessage: false
    }
  },
  computed: {
    ...mapState([
      'user'
    ]),
    ...mapGetters([
      'username'
    ]),
    avatar () {
      return this.user.profile.picture
    },
    email () {
      return this.user.profile.email
    },
    idToken () {
      return this.user.id_token || ''
    },
    expiresIn () {
      return moment.duration(this.user.expires_in, 'seconds').humanize()
    },
    expiresAt () {
      return moment(this.user.expires_at * 1000).format('MMMM Do YYYY, H:mm:ss')
    }
  },
  mounted () {
    const clipboard = new Clipboard(this.$refs.copy.$el)
    clipboard.on('success', event => {
      event.clearSelection()
      this.showMessage = true
      window.setTimeout(() => {
        this.showMessage = false
      }, 2000)
    })
    clipboard.on('error', err => {
      console.error('error', err)
    })
  }
}
</script>
