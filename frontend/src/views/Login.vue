<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-app>
    <v-main>
       <v-container class="container--fluid fill-height primary">
        <v-row
          no-gutters
          align="center"
          justify="center"
        >
          <v-col
            cols="12"
            sm="8"
            md="4"
            lg="3"
            xl="2"
          >
            <v-card class="elevation-5">
              <v-tabs
                background-color="primary lighten-2"
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
              <v-card-text>
                <div class="d-flex flex-column align-center">
                  <h1 class="my-4 primary--text">
                    Login to Gardener
                  </h1>
                  <v-tabs-items v-model="loginType">
                    <v-tab-item id="oidc">
                      <span class="text-center my-4">Press Login Button to be redirected to configured OpenID Connect Provider.</span>
                    </v-tab-item >
                    <v-tab-item id="token">
                      <span class="text-center my-4">Enter a bearer token trusted by the Kubernetes API server and press Login Button.</span>
                      <v-text-field
                        ref="token"
                        v-model="token"
                        color="grey"
                        :append-icon="showToken ? 'mdi-eye' : 'mdi-eye-off'"
                        :type="showToken ? 'text' : 'password'"
                        outline
                        label="Token"
                        @click:append="showToken = !showToken"
                        required>
                      </v-text-field>
                    </v-tab-item>
                  </v-tabs-items>
                  <v-btn @click="handleLogin" color="primary" class="mt-4">Login</v-btn>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
        <div :class="$vuetify.breakpoint.xs ? 'd-flex flex-grow-1 justify-center' : 'logo'">
          <img src="../assets/logo.svg" height="200px">
        </div>
        <div v-if="landingPageUrl" class="footer">
          <span class="primary--text text--darken-2">Discover what our service is about at the <a :href="landingPageUrl" target="_blank">Gardener Landing Page</a></span>
        </div>
      </v-container>
    </v-main>
    <vue-snotify></vue-snotify>
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
      token: '',

      loginType: undefined,
      loginTypes: [
        'oidc', 'token'
      ]
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
      console.log(value)
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

  .logo {
    position: absolute;
    right: 20px;
    bottom: 20px;
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
