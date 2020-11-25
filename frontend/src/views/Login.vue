<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-app >
    <div class="login-background secondary"></div>
    <v-main>
      <v-container class="fill-height" fluid>
        <v-row align="center" justify="center">
          <v-col cols="12" sm="8" md="4" lg="4">
            <v-card class="elevation-1 pa-3">
              <v-card-title>
                <div class="layout column align-center">
                  <img src="../assets/logo.svg" alt="Login to Gardener" width="180" height="180">
                  <h1 class="flex my-4 primary--text">Login to Gardener</h1>
                </div>
                <v-tabs
                  color="primary"
                  v-model="loginType"
                >
                <v-tab
                  v-for="item in loginTypes"
                  :key="item"
                  :href="`#${item}`"
                >
                  {{ item }}
                  </v-tab>
                </v-tabs>
              </v-card-title>
              <v-card-text class="login-form">
                <div class="d-flex flex-column align-center">
                  <v-tabs-items v-model="loginType">
                    <v-tab-item id="oidc">
                      <span class="text-center my-4 d-flex">Press Login Button to be redirected to configured OpenID Connect Provider.</span>
                    </v-tab-item >
                    <v-tab-item id="token">
                      <span class="text-center my-4">Enter a bearer token trusted by the Kubernetes API server and press Login Button.</span>
                      <v-text-field
                        ref="token"
                        v-model="token"
                        color="primary"
                        :append-icon="showToken ? 'mdi-eye' : 'mdi-eye-off'"
                        :type="showToken ? 'text' : 'password'"
                        outline
                        label="Token"
                        @click:append="showToken = !showToken"
                        required>
                      </v-text-field>
                    </v-tab-item>
                  </v-tabs-items>
                </div>
              </v-card-text>
              <v-card-actions>
                <v-spacer></v-spacer>
                  <v-btn @click="handleLogin" color="primary" class="mt-4">Login</v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
      <div v-if="landingPageUrl" class="footer">
        <span class="primary--text">Discover what our service is about at the <a :href="landingPageUrl" target="_blank">Gardener Landing Page</a></span>
      </div>
    </v-main>
    <vue-snotify></vue-snotify>
  </v-app>
</template>

<script>
import { mapState } from 'vuex'
import { SnotifyPosition } from 'vue-snotify'
import get from 'lodash/get'
import { setDelayedInputFocus } from '@/utils'

export default {
  data () {
    return {
      dialog: false,
      showToken: false,
      token: '',

      loginType: undefined,
      loginTypes: [
        'oidc', 'token'
      ]
    }
  },
  computed: {
    ...mapState([
      'cfg'
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
    handleLogin () {
      switch (this.loginType) {
        case 'oidc':
          this.oidcLogin()
          break
        case 'token':
          this.tokenLogin()
          break
      }
    },
    oidcLogin () {
      try {
        this.$auth.signinWithOidc(this.redirectPath)
      } catch (err) {
        this.showSnotifyLoginError(err.message)
      }
    },
    async tokenLogin () {
      try {
        const token = this.token
        this.token = undefined
        await this.$auth.signinWithToken(token)
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
  },
  mounted () {
    this.loginType = this.primaryLoginType
  },
  watch: {
    loginType (value) {
      if (value === 'token') {
        setDelayedInputFocus(this, 'token')
      }
    }
  }
}
</script>

<style lang="scss" scoped>

  @import '~vuetify/src/styles/styles.sass';
  @import "~vue-snotify/styles/material.css";

  .login-background {
    height: 50%;
    width: 100%;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 0;
  }

  .login-form {
    min-height: 120px;
  }

  .footer {
    position: absolute;
    bottom: 10px;
    left: 0px;
    width: 100%;
    text-align: center;
  }

  .snotify-rightTop {
    top: 75px;
  }

  .snotify {
    width: 400px;
  }

</style>
