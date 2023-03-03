<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-app-bar app tile fixed>
    <v-app-bar-nav-icon v-if="!sidebar" @click.native.stop="setSidebar(!sidebar)"></v-app-bar-nav-icon>
    <breadcrumb></breadcrumb>
    <v-spacer></v-spacer>
    <div class="text-center mr-2">
      <shoot-subscription-status></shoot-subscription-status>
    </div>
    <div class="text-center mr-6" v-if="helpMenuItems.length">
      <v-menu
        v-model="help"
        open-on-click
        close-on-content-click
        offset-y
        nudge-bottom="12"
        transition="slide-y-transition"
      >
        <template v-slot:activator="{ on: menu }">
          <v-tooltip left open-delay="500">
            <template v-slot:activator="{ on: tooltip }">
              <v-btn v-on="{ ...tooltip, ...menu }" icon color="primary">
                <v-icon medium>mdi-help-circle-outline</v-icon>
              </v-btn>
            </template>
            <span>Info</span>
          </v-tooltip>
        </template>
        <v-card tile width="300px">
          <v-card-title primary-title>
            <div class="content text-h6 mb-2">{{ productName }}</div>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-actions class="px-3">
            <v-btn block text color="primary" class="justify-start" @click="infoDialog=true" title="About">
              <v-icon color="primary" class="mr-3">mdi-information-outline</v-icon>
              About
            </v-btn>
          </v-card-actions>
          <template v-for="(item, index) in helpMenuItems">
            <v-divider :key="`d-${index}`"></v-divider>
            <v-card-actions :key="index" class="px-3">
              <v-btn block text color="primary" class="justify-start" :href="item.url" :target="helpTarget(item)" :title="item.title">
                <v-icon color="primary" class="mr-3">{{item.icon}}</v-icon>
                {{item.title}}
                <v-icon color="primary" class="link-icon">mdi-open-in-new</v-icon>
              </v-btn>
            </v-card-actions>
          </template>
        </v-card>
      </v-menu>
    </div>
    <div class="text-center">
      <v-menu
        v-model="menu"
        open-on-click
        close-on-content-click
        offset-y
        nudge-bottom="16"
        transition="slide-y-transition"
      >
        <template v-slot:activator="{ on: menu }">
          <v-tooltip left open-delay="500">
            <template v-slot:activator="{ on: tooltip }">
              <v-badge v-if="isAdmin" color="primary" bottom overlap icon="mdi-account-supervisor">
                <v-avatar v-on="{ ...menu, ...tooltip }" size="40px" class="cursor-pointer">
                  <img :src="avatarUrl" :alt="`avatar of ${avatarTitle}`"/>
                </v-avatar>
              </v-badge>
              <v-avatar v-else v-on="{ ...menu, ...tooltip }" size="40px" class="cursor-pointer">
                <img :src="avatarUrl" :alt="`avatar of ${avatarTitle}`"/>
              </v-avatar>
            </template>
            <span v-if="isAdmin">
              {{avatarTitle}}
              <v-chip small color="primary">
                <v-avatar>
                  <v-icon>mdi-account-supervisor</v-icon>
                </v-avatar>
                <span class="operator">Operator</span>
              </v-chip>
            </span>
            <span v-else>{{avatarTitle}}</span>
          </v-tooltip>
        </template>

        <v-card tile>
          <v-card-title primary-title>
            <div class="content">
              <div class="text-h6">{{displayName}}</div>
              <div class="text-caption">{{username}}</div>
              <div class="text-caption" v-if="isAdmin">Operator</div>
              <v-btn-toggle v-model="colorSchemeIndex" borderless mandatory @click.native.stop class="mt-3">
                <v-tooltip top>
                  <template v-slot:activator="{ on }">
                    <v-btn small v-on="on">
                      <v-icon color="primary">mdi-white-balance-sunny</v-icon>
                    </v-btn>
                  </template>
                  <span>Light Mode</span>
                </v-tooltip>
                <v-tooltip top>
                  <template v-slot:activator="{ on }">
                    <v-btn small v-on="on">
                      <v-icon color="primary">mdi-weather-night</v-icon>
                    </v-btn>
                  </template>
                  <span>Dark Mode</span>
                </v-tooltip>
                <v-tooltip top>
                  <template v-slot:activator="{ on }">
                    <v-btn small v-on="on">
                      <v-icon color="primary">mdi-brightness-auto</v-icon>
                    </v-btn>
                  </template>
                  <span>Automatically choose theme based on your system settings</span>
                </v-tooltip>
              </v-btn-toggle>
            </div>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-actions class="px-3">
            <v-btn block text color="primary" class="justify-start" :to="accountLink" title="My Account">
              <v-icon class="mr-3">mdi-account-circle</v-icon>
              My Account
            </v-btn>
          </v-card-actions>
          <v-card-actions class="px-3 pt-1">
            <v-btn block text color="secondary" class="justify-start" :to="settingsLink" title="Setting">
              <v-icon class="mr-3">mdi-cog</v-icon>
              Settings
            </v-btn>
          </v-card-actions>
          <v-divider></v-divider>
          <v-card-actions class="px-3">
            <v-btn block text color="pink" class="justify-start" @click.native.stop="handleLogout" title="Logout">
              <v-icon class="mr-3">mdi-exit-to-app</v-icon>
              Logout
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-menu>
    </div>
    <template v-if="tabs && tabs.length > 1" v-slot:extension>
      <v-tabs slider-color="primary darken-3" class="tabs-bar-background">
        <v-tab v-for="tab in tabs" :to="tab.to" :key="tab.key" ripple>
          {{tab.title}}
        </v-tab>
      </v-tabs>
    </template>
    <info-dialog v-model="infoDialog" @dialog-closed="infoDialog=false"></info-dialog>
  </v-app-bar>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex'
import get from 'lodash/get'
import Breadcrumb from '@/components/Breadcrumb'
import InfoDialog from '@/components/dialogs/InfoDialog'
import ShootSubscriptionStatus from '@/components/ShootSubscriptionStatus'

export default {
  name: 'toolbar-background',
  components: {
    Breadcrumb,
    InfoDialog,
    ShootSubscriptionStatus
  },
  data () {
    return {
      menu: false,
      help: false,
      infoDialog: false
    }
  },
  methods: {
    ...mapActions([
      'setSidebar',
      'setError'
    ]),
    ...mapActions('storage', [
      'setColorScheme'
    ]),
    handleLogout () {
      let err
      if (this.autoLoginEnabled) {
        err = new Error('NoAutoLogin')
      }
      this.$auth.signout(err)
    },
    targetRoute (name) {
      let query
      if (this.namespace) {
        query = { namespace: this.namespace }
      }
      return { name, query }
    }
  },
  computed: {
    ...mapState([
      'namespace',
      'title',
      'sidebar',
      'user',
      'cfg'
    ]),
    ...mapGetters([
      'username',
      'displayName',
      'avatarUrl',
      'isAdmin'
    ]),
    ...mapGetters('storage', [
      'autoLoginEnabled',
      'colorScheme'
    ]),
    helpMenuItems () {
      return this.cfg.helpMenuItems || {}
    },
    tabs () {
      const tabs = get(this.$route, 'meta.tabs')
      if (typeof tabs === 'function') {
        return tabs(this.$route)
      }
      return tabs
    },
    avatarTitle () {
      return `${this.displayName} (${this.username})`
    },
    helpTarget () {
      return (item) => {
        return get(item, 'target', '_blank')
      }
    },
    accountLink () {
      return this.targetRoute('Account')
    },
    settingsLink () {
      return this.targetRoute('Settings')
    },
    productName () {
      return sessionStorage.getItem('wl.productName') || 'Gardener'
    },
    colorSchemeIndex: {
      get () {
        switch (this.colorScheme) {
          case 'light':
            return 0
          case 'dark':
            return 1
          default:
            return 2
        }
      },
      set (value) {
        switch (value) {
          case 0:
            this.setColorScheme('light')
            break
          case 1:
            this.setColorScheme('dark')
            break
          default:
            this.setColorScheme('auto')
            break
        }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
  .content {
    text-align: center;
    display: block;
    padding-left: 8px;
    padding-right: 8px;
    width: 100%;
  }

  .link-icon {
    font-size: 100%;
    padding-left: 4px;
  }

  .operator {
    color: white;
    font-weight: bold;
  }

  .theme--light .tabs-bar-background {
    background-color: white;
  }

  .theme--dark .tabs-bar-background {
    background-color: black;
  }
</style>
