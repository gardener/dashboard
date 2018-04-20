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
  <v-toolbar fixed app>
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
        <v-btn slot="activator" icon class="cyan--text text--darken-2 mr-4" title="Gardener Landing Page">
          <v-icon medium>help_outline</v-icon>
        </v-btn>
        <v-card tile>
          <v-card-title primary-title>
            <div class="content">
              <div class="title">Gardener</div>
              <div class="caption">The Kubernetes Botanist</div>
            </div>
          </v-card-title>
          <template v-for="(item, index) in helpMenuItems">
            <v-divider v-if="index !== 0"></v-divider>
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
    <div class="text-xs-center">
      <v-menu
        offset-y
        open-on-click
        :nudge-bottom="12"
        transition="slide-y-transition"
        :close-on-content-click="true"
        v-model="menu"
      >
        <v-avatar slot="activator" size="40px">
          <img :src="avatar" :title="avatarTitle"/>
        </v-avatar>
        <v-card tile>
          <v-card-title primary-title>
            <div class="content">
              <div class="title">{{username}}</div>
              <div class="caption">{{email}}</div>
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
  </v-toolbar>
</template>

<script>
  import { mapState, mapGetters, mapActions } from 'vuex'
  import get from 'lodash/get'
  import { gravatar } from '@/utils'
  import Breadcrumb from '@/components/Breadcrumb'

  export default {
    name: 'toolbar',
    components: {
      Breadcrumb
    },
    data () {
      return {
        menu: false,
        help: false
      }
    },
    methods: {
      ...mapActions([
        'setSidebar'
      ]),
      handleLogout () {
        this.$router.push({name: 'Logout'})
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
        'username'
      ]),
      helpMenuItems () {
        return this.cfg.helpMenuItems || {}
      },
      avatar () {
        return gravatar(this.email)
      },
      email () {
        return this.user.profile.email
      },
      toolbarTitle () {
        return this.$route.meta.title || ''
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
        return {name: 'Account', query: this.$route.query}
      }
    }
  }
</script>

<style lang="styl" scoped>

  .content {
    text-align: center;
    display: block;
  }

  .action-button >>> .btn__content {
    justify-content: left
  }

  .link-icon {
    font-size: 100%;
    padding-left: 4px;
  }

</style>
