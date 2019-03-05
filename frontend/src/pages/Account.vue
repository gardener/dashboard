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
  <v-container fluid>
    <v-card class="mt-2">
      <v-toolbar card class="teal darken-1" dark>
        <v-icon class="white--text pr-2">{{icon}}</v-icon>
        <v-toolbar-title>User Details</v-toolbar-title>
        <v-spacer></v-spacer>
        <copy-btn :clipboard-text="idToken" copy-success-text="Copied ID Token to clipboard!"></copy-btn>
      </v-toolbar>
      <v-card-text>
        <v-layout row wrap>
          <v-flex md6 xs12>
            <label class="caption grey--text text--darken-2">Name</label>
            <p class="pt-2">
              <account-avatar :account-name="username" mailTo :size="32"/>
            </p>
          </v-flex>
          <v-flex v-if="!!name" md6 xs12>
            <label class="caption grey--text text--darken-2">Display Name</label>
            <p class="subheading">{{name}}</p>
          </v-flex>
          <v-flex md6 xs12>
            <label class="caption grey--text text--darken-2">Groups</label>
            <p>
              <v-chip v-for="(group, index) in groups" :key="index" outline text-color="grey darken-2">{{group}}</v-chip>
            </p>
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
import CopyBtn from '@/components/CopyBtn'
import AccountAvatar from '@/components/AccountAvatar'
import { getToken } from '@/utils/api'
import { mapState, mapGetters } from 'vuex'
import moment from 'moment-timezone'

export default {
  components: {
    CopyBtn,
    AccountAvatar
  },
  name: 'profile',
  data () {
    return {
      idToken: undefined,
      showToken: false,
      floatingButton: false,
      showMessage: false
    }
  },
  async mounted () {
    try {
      const { data } = await getToken()
      this.idToken = data.token
    } catch (err) {
      console.error(err.message)
    }
  },
  computed: {
    ...mapState([
      'user'
    ]),
    ...mapGetters([
      'username',
      'fullDisplayName',
      'isAdmin',
      'canCreateProject'
    ]),
    icon () {
      return this.isAdmin ? 'supervisor_account' : 'mdi-account'
    },
    id () {
      return this.user.id
    },
    name () {
      return this.fullDisplayName
    },
    groups () {
      return this.user.groups
    },
    expiresAt () {
      return moment.duration(this.user.exp - Math.floor(Date.now() / 1000), 'seconds').humanize(true)
    }
  }
}
</script>
