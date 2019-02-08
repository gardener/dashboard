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
  <v-toolbar fixed app :tabs="!!tabs">
    <v-toolbar-side-icon v-if="!sidebar" @click.native.stop="setSidebar(!sidebar)"></v-toolbar-side-icon>
    <breadcrumb></breadcrumb>
    <v-spacer></v-spacer>
    <div class="text-xs-center" v-if="helpMenuItems.length">
      <v-menu
        offset-y
        open-on-click
        :nudge-bottom="12"
        transition="slide-y-transition"
        :close-on-content-click="true"
        v-model="help"
        >
        <v-tooltip left slot="activator" open-delay="500">
          <v-btn slot="activator" icon class="cyan--text text--darken-2">
            <v-icon medium>help_outline</v-icon>
          </v-btn>
          Info
        </v-tooltip>
        <v-card tile>
          <v-card-title primary-title>
            <div class="content">
              <div class="title mb-2">Gardener</div>
              <div class="caption" v-if="!!gardenerVersion">API version {{gardenerVersion}}</div>
              <div class="caption" v-if="!!dashboardVersion">Dashboard version {{dashboardVersion}}</div>
            </div>
          </v-card-title>
          <v-divider></v-divider>
          <template v-for="(item, index) in helpMenuItems">
            <v-divider v-if="index !== 0" :key="`d-${index}`"></v-divider>
            <v-card-actions :key="index">
              <v-btn block flat class="action-button cyan--text text--darken-2" :href="item.url" :target="helpTarget(item)" :title="item.title">
                <v-icon left color="cyan darken-2">{{item.icon}}</v-icon>
                {{item.title}}
                <v-icon color="cyan darken-2" class="link-icon">mdi-open-in-new</v-icon>
              </v-btn>
            </v-card-actions>
          </template>
        </v-card>
      </v-menu>
    </div>
     <v-divider
      class="mx-3"
      inset
      vertical
    ></v-divider>
    <div class="text-xs-center">
      <v-tooltip left slot="activator" open-delay="500">
        <v-btn slot="activator" icon :to="gardenTerminalLink" class="cyan--text text--darken-2 mr-4">
          <v-icon medium>mdi-console</v-icon>
        </v-btn>
        Garden Cluster Terminal
      </v-tooltip>
    </div>
    <div class="text-xs-center">
      <v-menu
        offset-y
        open-on-click
        :nudge-bottom="12"
        transition="slide-y-transition"
        :close-on-content-click="true"
        v-model="menu"
      >
        <v-tooltip left slot="activator" open-delay="500">
          <v-badge v-if="isAdmin" slot="activator" color="cyan darken-2" bottom overlap>
            <v-icon slot="badge" small dark>supervisor_account</v-icon>
            <v-avatar size="40px">
              <img :src="avatar"/>
            </v-avatar>
          </v-badge>
          <v-avatar v-else slot="activator" size="40px">
            <img :src="avatar"/>
          </v-avatar>
          <span v-if="isAdmin">
            {{avatarTitle}}
            <v-chip small color="cyan darken-2" dark>
              <v-avatar>
                <v-icon>supervisor_account</v-icon>
              </v-avatar>
              <span class="operator">Operator</span>
            </v-chip>
          </span>
          <span v-else>{{avatarTitle}}</span>
        </v-tooltip>
        <v-card tile>
          <v-card-title primary-title>
            <div class="content">
              <div class="title">{{username}}</div>
              <div class="caption">{{email}}</div>
              <div class="caption" v-if="isAdmin">Operator</div>
            </div>
          </v-card-title>
          <v-card-actions>
            <v-btn block flat class="action-button cyan--text text--darken-2" :to="accountLink" title="My Account">
              <v-icon left>account_circle</v-icon>
              My Account
            </v-btn>
          </v-card-actions>
          <v-divider></v-divider>
          <v-card-actions>
            <v-btn block flat class="action-button pink--text" @click.native.stop="handleLogout" title="Logout">
              <v-icon left>exit_to_app</v-icon>
              Logout
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-menu>
    </div>
    <v-tabs v-if="tabs" slot="extension" slider-color="grey darken-3">
      <template v-for="(tab, key) in tabs">
        <v-spacer v-if="tab.spacer" :key="key"></v-spacer>
        <v-tab :to="tab.to($route)" :key="key" ripple>
          {{tab.title}}
        </v-tab>
      </template>
    </v-tabs>
  </v-toolbar>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex'
import get from 'lodash/get'
import filter from 'lodash/filter'
import { gravatarUrlIdenticon } from '@/utils'
import Breadcrumb from '@/components/Breadcrumb'
import { getInfo } from '@/utils/api'

export default {
  name: 'toolbar',
  components: {
    Breadcrumb
  },
  data () {
    return {
      menu: false,
      help: false,
      gardenerVersion: undefined,
      dashboardVersion: undefined
    }
  },
  methods: {
    ...mapActions([
      'setSidebar',
      'setError'
    ]),
    handleLogout () {
      this.$router.push({ name: 'Logout' })
    }
  },
  computed: {
    ...mapState([
      'title',
      'sidebar',
      'user',
      'cfg'
    ]),
    ...mapGetters([
      'username',
      'isAdmin'
    ]),
    helpMenuItems () {
      return this.cfg.helpMenuItems || {}
    },
    avatar () {
      return gravatarUrlIdenticon(this.email)
    },
    email () {
      return this.user.profile.email
    },
    tabs () {
      return get(this.$route, 'meta.tabs', false)
    },
    avatarTitle () {
      return `${this.username} (${this.email})`
    },
    helpTarget () {
      return (item) => {
        return get(item, 'target', '_blank')
      }
    },
    accountLink () {
      return { name: 'Account', query: this.$route.query }
    },
    gardenTerminalLink () {
      return { name: 'GardenTerminal', params: { target: 'garden', namespace: 'garden' } }
    }
  },
  watch: {
    help (value) {
      if (value && !this.dashboardVersion) {
        getInfo({ user: this.user }).then(res => {
          const data = get(res, 'data')
          if (data.gardenerVersion) {
            this.gardenerVersion = `${data.gardenerVersion.major}.${data.gardenerVersion.minor}`
          }
          if (data.version) {
            this.dashboardVersion = `${data.version}`
          }
        }).catch(error => {
          this.setError({ message: `Failed to fetch version information. ${error.message}` })
        })
      }
    }
  }
}

</script>

<style lang="styl" scoped>

  .content {
    text-align: center;
    display: block;
    width: 100%;
  }

  .action-button >>> .v-btn__content {
    justify-content: left
  }

  .link-icon {
    font-size: 100%;
    padding-left: 4px;
  }

  .operator {
    color: white;
    font-weight: bold;
  }

  >>> .v-toolbar__extension {
    padding: 0;
  }

</style>
