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
      <v-container fluid class="fill-height align-stretch">
        <v-row>
          <v-col cols="5" class="d-flex flex-column">
            <div class="flex-grow-1">
              <img src="../assets/logo.svg" class="logo">
              <h1>Gardener</h1>
              <h2>Universal Kubernetes at Scale</h2>
            </div>
            <div class="flex-grow-0 px-2">
              <img :src="footerLogoUrl" height="24">
            </div>
          </v-col>
          <v-col cols="7" class="d-flex flex-column">
              <div class="flex-shrink-1">
                <h1>Enterprise-Grade Kubernetes Service</h1>
                <h2>Infrastructure agnostic and working across all major public clouds</h2>
              </div>
              <div v-if="landingPageUrl" class="flex-shrink-1 hint">
                <span>Discover what our service is about at the</span>
                <a :href="landingPageUrl" target="_blank">Gardener Landing Page <v-icon size="20">mdi-open-in-new</v-icon></a>
              </div>
              <div class="flex-grow-1 actions">
                <div class="loginButton orange lighten-2 elevation-2" @click.stop="handleLogin(primaryLoginType)">
                  Login <v-icon dark class="ml-1">mdi-login-variant</v-icon>
                </div>
                <template v-if="showTokenLoginLink">
                  <div class="loginLink">
                    <a @click.stop="handleLogin('token')">Login with Bearer Token</a>
                  </div>
                </template>
              </div>
              <div class=" flex-shrink-1 text-right pr-2">
                &copy; {{ new Date().getFullYear() }}
              </div>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
    <vue-snotify></vue-snotify>
    <v-dialog v-model="dialog" persistent max-width="480px">
      <v-card>
        <v-card-title class="orange lighten-1">
          <span class="headline white--text">Login</span>
        </v-card-title>
        <v-card-text>
          <v-text-field
            ref="token"
            v-model="token"
            color="grey"
            :append-icon="showToken ? 'visibility' : 'visibility_off'"
            :type="showToken ? 'text' : 'password'"
            outline
            label="Token"
            hint="Enter a bearer token trusted by the Kubernetes API server"
            persistent-hint
            @click:append="showToken = !showToken"
            required>
          </v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="closeDialog">Cancel</v-btn>
          <v-btn text color="teal darken-2" @click="submitToken">Ok</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script>
import { mapState, mapActions } from 'vuex'
import { SnotifyPosition } from 'vue-snotify'
import get from 'lodash/get'
import { setDelayedInputFocus } from '@/utils'

export default {
  data () {
    return {
      dialog: false,
      showToken: false,
      token: ''
    }
  },
  computed: {
    ...mapState([
      'color',
      'cfg',
      'user'
    ]),
    redirectPath () {
      return get(this.$route.query, 'redirectPath', '/')
    },
    primaryLoginType () {
      return this.cfg.primaryLoginType || 'oidc'
    },
    showTokenLoginLink () {
      return this.primaryLoginType === 'oidc'
    },
    landingPageUrl () {
      return this.cfg.landingPageUrl
    },
    footerLogoUrl () {
      return this.cfg.footerLogoUrl || '/static/sap-logo.svg'
    },
    drawerWidth () {
      return Math.floor(this.windowSize.width * 0.4)
    }
  },
  beforeRouteEnter (to, from, next) {
    let err
    if (/^#.+/.test(to.hash)) {
      const searchParams = new URLSearchParams(to.hash.substring(1))
      if (searchParams.has('error')) {
        err = new Error(searchParams.get('error'))
      }
    }
    next(vm => {
      if (err) {
        vm.showSnotifyLoginError(err.message)
        vm.$router.replace('/login')
      }
    })
  },
  methods: {
    ...mapActions([
      'unsetUser'
    ]),
    handleLogin (loginType) {
      if (loginType === 'token') {
        this.dialog = true
        setDelayedInputFocus(this, 'token')
      } else {
        try {
          this.$userManager.signinWithOidc(this.redirectPath)
        } catch (err) {
          this.showSnotifyLoginError(err.message)
        }
      }
    },
    closeDialog () {
      this.dialog = false
      this.token = undefined
    },
    async submitToken () {
      try {
        const token = this.token
        this.token = undefined
        await this.$userManager.signinWithToken(token)
        this.dialog = false
        try {
          await this.$router.push(this.redirectPath)
        } catch (err) {
          /* Catch and ignore navigation aborted errors. Redirection happens in navigation guards (see https://router.vuejs.org/guide/essentials/navigation.html#router-push-location-oncomplete-onabort). */
        }
      } catch (err) {
        this.dialog = false
        this.showSnotifyLoginError(err.message)
      }
    },
    showSnotifyLoginError (message) {
      const config = {
        position: SnotifyPosition.rightBottom,
        timeout: 5000,
        showProgressBar: false
      }
      this.$snotify.error(message, 'Login Error', config)
    }
  }
}
</script>

<style lang="scss" scoped>

$bg1: #24232c;
$bg2: #504e5a;

$font1: #ffffff;
$font2: #958071;

$hexArea: lighten(#D8D7DA,9);
$hexOutline: darken($hexArea,1);

#app {
  main {
    .container {
      padding: 0;
      .row {
        margin: 0;
        .col:nth-child(1) {
          background-color: #2c353d;
          padding: 0;

          .logo {
            height: 20vw;
            pointer-events: none;
            display: block;
            margin: auto;
            margin-top: 100px;
          }

          h1 {
            font-size: 4vw;
            font-weight: 200;
            width: 100%;
            text-align: center;
            color: $font1;
            letter-spacing: 5px;
          }

          h2 {
            font-size: 1.8vw;
            font-weight: 300;
            width: 100%;
            color: #009F76;
            text-align: center;
          }
        }

        .col:nth-child(2) {
          background-color: white;
          padding: 100px 0px 0px 50px;
          background:
            radial-gradient(circle farthest-side at 0% 50%, $hexArea 23.5%, rgba(240, 166, 17, 0) 0) 21px 30px,
            radial-gradient(circle farthest-side at 0% 50%, $hexOutline 24%, rgba(240, 166, 17, 0) 0) 19px 30px,
            linear-gradient($hexArea 14%, rgba(240, 166, 17, 0) 0, rgba(240, 166, 17, 0) 85%, $hexArea 0) 0 0,
            linear-gradient(150deg, $hexArea 24%, $hexOutline 0, $hexOutline 26%, rgba(240, 166, 17, 0) 0, rgba(240, 166, 17, 0) 74%, $hexOutline 0, $hexOutline 76%, $hexArea 0) 0 0,
            linear-gradient(30deg, $hexArea 24%, $hexOutline 0, $hexOutline 26%, rgba(240, 166, 17, 0) 0, rgba(240, 166, 17, 0) 74%, $hexOutline 0, $hexOutline 76%, $hexArea 0) 0 0,
            linear-gradient(90deg, $hexOutline 2%, $hexArea 0, $hexArea 98%, $hexOutline 0%) 0 0 $hexOutline;
          background-size: 40px 60px;

          h1 {
            font-size: 2.5vw;
            width: 100%;
            text-align: left;
            font-family: 'Roboto', sans-serif;
            color: $bg2;
            white-space: nowrap;
            font-weight: 400;
          }

          h2 {
            font-size: 1.6vw;
            width: 100%;
            text-align: left;
            font-weight: 400;
          }

          .hint {
            padding-top: 48px;
            font-size: 1.3vw;
            width: 100%;
            text-align: left;
            font-weight: 500;

            a {
              color: #009688;
              padding-left: 10px;
              text-decoration: none;
              &:hover {
                color: #26A69A;
              }
            }

          }

          .actions {
            position: relative;

            .loginButton {
              padding: 10px;
              padding-left: 40px;
              color: white;
              font-size: 20px;
              cursor: pointer;
              bottom: 80px;
              position: absolute;
              right: 0px;
              width: 40%;
            }

            .loginLink {
              padding: 5px;
              padding-left: 10px;
              background-color: transparent;
              font-size: 11px;
              position: absolute;
              right: 0px;
              bottom: 50px;
              width: 40%;

              a {
                color: #cfcfcf;
                &:hover {
                  color: #ffb74d;
                }
              }
            }
          }
        }
      }
    }
  }
}

@import '~vue-snotify/styles/material.css';
@import '~vuetify/src/styles/styles.sass';

.snotify-rightTop {
  top: 75px;
}

.snotify-info {
  background-color: map-get($cyan, 'darken-2');
}

.snotify {
  width: 400px;
}

</style>
