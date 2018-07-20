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
    <v-card class="mr-extra">
      <v-toolbar card color="teal darken-2">
        <v-icon class="white--text pr-2">mdi-account-settings-variant</v-icon>
        <v-toolbar-title class="subheading white--text">
          Main Contact
        </v-toolbar-title>
      </v-toolbar>
      <v-list v-if="!!owner" two-line subheader>
        <v-list-tile avatar>
          <v-list-tile-avatar>
            <img :src="avatar(owner)" />
          </v-list-tile-avatar>
          <v-list-tile-content>
            <v-list-tile-title>{{displayName(owner)}}</v-list-tile-title>
            <v-list-tile-sub-title><a :href="'mailto:'+owner" class="cyan--text text--darken-2">{{owner}}</a></v-list-tile-sub-title>
          </v-list-tile-content>
        </v-list-tile>
      </v-list>
      <v-list v-else two-line subheader>
        <v-list-tile avatar>
          <v-list-tile-content>
            <v-list-tile-title>This project has no main contact configured.</v-list-tile-title>
            <v-list-tile-sub-title>You can set a main contact on the <router-link :to="{ name: 'Administration', params: { namespace:project.metadata.namespace } }">administration</router-link> page by selecting one of the members from the list below.</v-list-tile-sub-title>
          </v-list-tile-content>
        </v-list-tile>
      </v-list>
    </v-card>

    <v-card class="mr-extra mt-4">
      <v-toolbar card color="green darken-2">
        <v-icon class="white--text pr-2">mdi-account-multiple</v-icon>
        <v-toolbar-title class="subheading white--text">
          Project Members
        </v-toolbar-title>
        <v-spacer></v-spacer>
          <v-text-field v-if="memberList.length > 3"
            prepend-icon="search"
            color="green darken-2"
            label="Search"
            solo
            clearable
            v-model="filter"
            @keyup.esc="filter=''"
          ></v-text-field>
      </v-toolbar>

      <v-card-text v-if="!memberListWithoutOwner.length">
        <div class="title grey--text text--darken-1 my-3">Add members to your project.</div>
        <p class="body-1">
          Adding members to your project allows you to collaborate across your team.
          Project members have full access to all resources within your project.
        </p>
      </v-card-text>
      <v-list two-line subheader v-else>
        <template v-for="(name, index) in sortedAndFilteredMemberList">
          <v-divider
            v-if="index > 0"
            inset
            :key="`${name}-dividerKey`"
          ></v-divider>
          <v-list-tile
            avatar
            :key="name"
          >
            <v-list-tile-avatar>
              <img :src="avatar(name)" />
            </v-list-tile-avatar>
            <v-list-tile-content>
              <v-list-tile-title>
                {{displayName(name)}}
              </v-list-tile-title>
              <v-list-tile-sub-title>
                <a :href="'mailto:'+name" class="cyan--text text--darken-2">{{name}}</a>
              </v-list-tile-sub-title>
            </v-list-tile-content>
            <v-list-tile-action>
              <v-btn icon class="red--text text--darken-2" @click.native.stop="onDelete(name)">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </v-list-tile-action>
          </v-list-tile>
        </template>
      </v-list>
    </v-card>

    <v-card class="mr-extra mt-4">
      <v-toolbar card color="blue-grey">
        <v-icon class="white--text pr-2">mdi-monitor-multiple</v-icon>
        <v-toolbar-title class="subheading white--text">
          Service Accounts
        </v-toolbar-title>
      </v-toolbar>

      <v-card-text v-if="!serviceAccountList.length">
        <div class="title grey--text text--darken-1 my-3">Add service accounts to your project.</div>
        <p class="body-1">
          Adding service accounts to your project allows you to automate processes in your project.
          Service accounts have full access to all resources within your project.
        </p>
      </v-card-text>
      <v-list two-line subheader v-else>
        <template v-for="(name, index) in serviceAccountList">
          <v-divider
            v-if="index > 0"
            inset
            :key="`${name}-dividerKey`"
          ></v-divider>
          <v-list-tile
            avatar
            :key="name"
          >

            <v-list-tile-avatar>
              <img :src="`https://robohash.org/${name}`" />
            </v-list-tile-avatar>
            <v-list-tile-content>
              <v-list-tile-title>
                {{name.replace(/^system:serviceaccount:[^:]+:/, '').toUpperCase()}}
              </v-list-tile-title>
              <v-list-tile-sub-title>
                {{name}}
              </v-list-tile-sub-title>
            </v-list-tile-content>
            <v-list-tile-action>
              <v-tooltip top>
                <v-btn slot="activator" icon class="grey--text" @click.native.stop="onDownload(name)">
                  <v-icon>mdi-download</v-icon>
                </v-btn>
                <span>download kubeconfig</span>
              </v-tooltip>
            </v-list-tile-action>
            <v-list-tile-action>
              <v-btn icon class="red--text text--darken-2" @click.native.stop="onDelete(name)">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </v-list-tile-action>
          </v-list-tile>
        </template>
      </v-list>
    </v-card>

    <member-dialog type="user" v-model="memberDialog"></member-dialog>
    <member-dialog type="service" v-model="serviceaccountDialog"></member-dialog>
    <v-speed-dial
      v-model="fab"
      fixed
      bottom
      right
      direction="top"
      transition="slide-y-reverse-transition"
    >
      <v-btn
        slot="activator"
        v-model="fab"
        color="cyan darken-2"
        dark
        fab
      >
        <v-icon>add</v-icon>
        <v-icon>close</v-icon>
      </v-btn>
      <v-btn
        fab
        small
        color="grey lighten-2"
        @click="openMemberDialog"
      >
        <v-icon color="green darken-2">person</v-icon>
      </v-btn>
      <v-btn
        fab
        small
        color="grey lighten-2"
        light
        @click="openServiceaccountDialog"
      >
        <v-icon color="blue-grey darken-2">mdi-monitor</v-icon>
      </v-btn>
    </v-speed-dial>
  </v-container>
</template>

<script>
  import includes from 'lodash/includes'
  import toLower from 'lodash/toLower'
  import replace from 'lodash/replace'
  import sortBy from 'lodash/sortBy'
  import startsWith from 'lodash/startsWith'
  import find from 'lodash/find'
  import download from 'downloadjs'
  import filter from 'lodash/filter'
  import MemberDialog from '@/dialogs/MemberDialog'
  import { mapState, mapActions, mapGetters } from 'vuex'
  import { emailToDisplayName, gravatar } from '@/utils'
  import { getMember } from '@/utils/api'

  export default {
    name: 'members',
    components: {
      MemberDialog
    },
    data () {
      return {
        memberDialog: false,
        serviceaccountDialog: false,
        filter: '',
        fab: false
      }
    },
    computed: {
      ...mapState([
        'user',
        'namespace'
      ]),
      ...mapGetters([
        'memberList',
        'projectList'
      ]),
      project () {
        const predicate = project => project.metadata.namespace === this.namespace
        return find(this.projectList, predicate)
      },
      projectData () {
        return this.project.data || {}
      },
      owner () {
        return toLower(this.projectData.owner)
      },
      serviceAccountList () {
        const predicate = username => startsWith(username, `system:serviceaccount:${this.namespace}:`)
        return filter(this.memberList, predicate)
      },
      memberListWithoutOwner () {
        const predicate = username => !this.isOwner(username) && !startsWith(username, 'system:serviceaccount:')
        return filter(this.memberList, predicate)
      },
      sortedAndFilteredMemberList () {
        const predicate = email => {
          if (!this.filter) {
            return true
          }
          const name = replace(email, /@.*$/, '')
          return includes(toLower(name), toLower(this.filter))
        }
        return sortBy(filter(this.memberListWithoutOwner, predicate))
      }
    },
    methods: {
      ...mapActions([
        'addMember',
        'deleteMember',
        'setError'
      ]),
      openMemberDialog () {
        this.memberDialog = true
      },
      openServiceaccountDialog () {
        this.serviceaccountDialog = true
      },
      displayName (email) {
        return emailToDisplayName(email)
      },
      isOwner (email) {
        return this.owner === toLower(email)
      },
      avatar (email) {
        return gravatar(email)
      },
      async onDownload (name) {
        const namespace = this.namespace
        const user = this.user
        try {
          const {data} = await getMember({namespace, name, user})
          download(data.kubeconfig, 'kubeconfig.yaml', 'text/plain')
        } catch (err) {
          this.setError(err)
        }
      },
      onDelete (username) {
        this.deleteMember(username)
      }
    },
    created () {
      this.$bus.$on('esc-pressed', () => {
        this.memberDialog = false
        this.serviceaccountDialog = false
        this.fab = false
      })
    }
  }
</script>
