<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-app-bar>
    <v-app-bar-nav-icon v-if="!sidebar" @click.stop="setSidebar(!sidebar)"></v-app-bar-nav-icon>
    <breadcrumb/>
    <v-spacer></v-spacer>

    <!-- connection status -->
    <div class="mr-2">
      <shoot-subscription-status/>
    </div>

    <!-- Help -->
    <v-btn v-if="helpMenuItems.length" color="primary" icon class="mr-4">
      <v-tooltip text="Tooltip" location="left">
        <template v-slot:activator="{ props }">
          <v-icon v-bind="props" icon="mdi-help-circle-outline"></v-icon>
        </template>
      </v-tooltip>

      <v-menu
        activator="parent"
        v-model="help"
        open-on-click
        close-on-content-click
        :offset="[12, 0]"
        transition="slide-y-transition"
      >
        <v-card rounded="0" width="300px">
          <v-card-title primary-title>
            <div class="content text-h6 mb-2">Gardener</div>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-actions class="px-3">
            <v-btn block variant="text" color="primary" class="justify-start" @click="infoDialog=true" title="About">
              <v-icon color="primary" class="mr-3">mdi-information-outline</v-icon>
              About
            </v-btn>
          </v-card-actions>
          <template :key="index" v-for="(item, index) in helpMenuItems">
            <v-divider></v-divider>
            <v-card-actions class="px-3">
              <v-btn block variant="text" color="primary" class="justify-start" :href="item.url" :target="helpTarget(item)" :title="item.title">
                <v-icon color="primary" class="mr-3">{{item.icon}}</v-icon>
                {{item.title}}
                <v-icon color="primary" class="link-icon">mdi-open-in-new</v-icon>
              </v-btn>
            </v-card-actions>
          </template>
        </v-card>
      </v-menu>
    </v-btn>

    <!-- Profile badge -->
    <v-btn color="primary" icon class="mr-4">
      <v-tooltip location="left">
        <template v-slot:activator="{ props }">
          <v-badge v-if="isAdmin" color="primary" bottom icon="mdi-account-supervisor">
            <v-avatar v-bind="props" v-on="{ ...menu }" size="40" class="cursor-pointer">
              <v-img :src="avatarUrl" :alt="`avatar of ${avatarTitle}`" />
            </v-avatar>
          </v-badge>
          <v-avatar v-else v-bind="props" v-on="{ ...menu }" size="40" class="cursor-pointer">
            <v-img :src="avatarUrl" :alt="`avatar of ${avatarTitle}`" />
          </v-avatar>
        </template>
        <span v-if="isAdmin">
          {{avatarTitle}}
          <v-chip small color="primary" variant="elevated">
            <v-avatar>
              <v-icon>mdi-account-supervisor</v-icon>
            </v-avatar>
            <span class="operator">Operator</span>
          </v-chip>
        </span>
        <span v-else>{{avatarTitle}}</span>
      </v-tooltip>

      <v-menu
        activator="parent"
        open-on-click
        close-on-content-click
        :offset="[12, 0]"
        transition="slide-y-transition"
      >
        <v-card rounded="0">
          <v-card-title primary-title>
            <div class="content">
              <div class="text-h6">{{displayName}}</div>
              <div class="text-caption">{{username}}</div>
              <div class="text-caption" v-if="isAdmin">Operator</div>
              <v-btn-toggle v-model="colorSchemeIndex" mandatory @click.stop class="mt-3 d-flex flex-row" variant="tonal" density="compact">
                <v-tooltip location="top">
                  <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" icon class="flex-grow-1">
                      <v-icon color="primary">mdi-white-balance-sunny</v-icon>
                    </v-btn>
                  </template>
                  <span>Light Mode</span>
                </v-tooltip>
                <v-tooltip location="top">
                  <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" icon class="flex-grow-1">
                      <v-icon color="primary">mdi-weather-night</v-icon>
                    </v-btn>
                  </template>
                  <span>Dark Mode</span>
                </v-tooltip>
                <v-tooltip location="top">
                  <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" icon class="flex-grow-1">
                      <v-icon color="primary">mdi-brightness-auto</v-icon>
                    </v-btn>
                  </template>
                  <span>Automatically choose theme based on your system settings</span>
                </v-tooltip>
              </v-btn-toggle>
            </div>
          </v-card-title>
          <v-divider></v-divider>
          TODO (re-add actions)
          <!-- TODO: the targeted routes are not ready yet. Adding those router links causes a runtime error. -->
          <!--<v-card-actions class="px-3">
            <v-btn block variant="text" color="primary" class="justify-start" :to="accountLink" title="My Account">
              <v-icon class="mr-3">mdi-account-circle</v-icon>
              My Account
            </v-btn>
          </v-card-actions>
          <v-card-actions class="px-3 pt-1">
            <v-btn block variant="text" color="secondary" class="justify-start" :to="settingsLink" title="Setting">
              <v-icon class="mr-3">mdi-cog</v-icon>
              Settings
            </v-btn>
          </v-card-actions>-->
          <v-divider></v-divider>
          <v-card-actions class="px-3">
            <v-btn block variant="text" color="pink" class="justify-start" @click.stop="handleLogout" title="Logout">
              <v-icon class="mr-3">mdi-exit-to-app</v-icon>
              Logout
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-menu>
    </v-btn>

    <!-- terminals -->
    <template v-if="tabs && tabs.length > 1" v-slot:extension>
      <v-tabs slider-color="primary darken-3" class="tabs-bar-background">
        <v-tab v-for="tab in tabs" :to="tab.to" :key="tab.key" ripple>
          {{tab.title}}
        </v-tab>
      </v-tabs>
    </template>
    <info-dialog v-model="infoDialog" @dialog-closed="infoDialog=false"/>
  </v-app-bar>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex'
import get from 'lodash/get'
import Breadcrumb from '@/components/Breadcrumb.vue'
import InfoDialog from '@/components/dialogs/InfoDialog.vue'
import ShootSubscriptionStatus from '@/components/ShootSubscriptionStatus.vue'

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
