<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <v-app >
    <div class="login-background main-background"></div>
    <v-main>
      <v-container class="fill-height" fluid>
        <v-row align="center" justify="center">
          <v-col cols="12" sm="8" md="4" lg="4">
            <v-card class="elevation-1">
              <v-card-title class="pa-0">
                <div class="layout column align-center main-background darken-1 pa-3 pt-6">
                  <img src="/static/assets/logo.svg" alt="Login to Gardener" width="180" height="180">
                  <span class="flex my-4 primary--text text-h5 font-weight-light">Universal Kubernetes at Scale</span>
                </div>
                <v-tabs
                  v-show="!loading"
                  centered
                  color="primary"
                  v-model="loginType"
                >
                  <v-tab
                    v-for="item in cfg.loginTypes"
                    :key="item"
                    :href="`#${item}`"
                  >
                    {{ item }}
                  </v-tab>
                </v-tabs>
              </v-card-title>
              <v-card-text class="login-form d-flex align-center justify-center py-0">
                <v-skeleton-loader
                  v-show="loading"
                  width="100%"
                  type="card"
                ></v-skeleton-loader>
                <v-tabs-items v-show="!loading" v-model="loginType">
                    <v-tab-item id="oidc">
                      <div class="text-subtitle-1 text-center">Press Login to be redirected to configured<br> OpenID Connect Provider.</div>
                    </v-tab-item >
                    <v-tab-item id="token">
                      <div class="text-subtitle-1 text-center pt-3">Enter a bearer token trusted by the Kubernetes API server and press Login.</div>
                      <v-text-field
                        ref="token"
                        v-model="token"
                        color="primary"
                        :append-icon="showToken ? 'mdi-eye' : 'mdi-eye-off'"
                        :type="showToken ? 'text' : 'password'"
                        outlined
                        label="Token"
                        @click:append="showToken = !showToken"
                        required>
                      </v-text-field>
                    </v-tab-item>
                  </v-tabs-items>
              </v-card-text>
              <v-card-actions v-show="!loading" class="bt-2 pb-4">
                <div class="d-flex justify-center flex-grow-1">
                  <v-btn @click="handleLogin" color="primary">Login</v-btn>
                </div>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
      <div v-if="landingPageUrl" class="footer text-caption">
        <span class="primary--text">Discover what our service is about at the <a :href="landingPageUrl" target="_blank" rel="noopener">Gardener Landing Page</a></span>
      </div>
    </v-main>
    <g-snotify></g-snotify>
  </v-app>
</template>

<script>
import { mapGetters } from 'vuex'
import { SnotifyPosition } from 'vue-snotify'
import get from 'lodash/get'
import head from 'lodash/head'
import { setDelayedInputFocus } from '@/utils'
import { createTokenReview, getLoginConfiguration } from '@/utils/api'
import GSnotify from '@/components/GSnotify.vue'

export default {
  components: {
    GSnotify
  },
  data () {
    return {
      dialog: false,
      showToken: false,
      token: '',
      loginType: undefined,
      cfg: {
        loginTypes: undefined,
        landingPageUrl: undefined
      },
      loading: false
    }
  },
  computed: {
    ...mapGetters('storage', [
      'autoLoginEnabled'
    ]),
    redirectPath () {
      return get(this.$route.query, 'redirectPath', '/')
    },
    primaryLoginType () {
      return head(this.cfg.loginTypes) || 'oidc'
    },
    showTokenLoginLink () {
      return this.primaryLoginType === 'oidc'
    },
    landingPageUrl () {
      return this.cfg.landingPageUrl
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
    async getLoginConfiguration () {
      const { data: cfg } = await getLoginConfiguration()
      Object.assign(this.cfg, cfg)
    },
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
        await createTokenReview({ token })
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
  async created () {
    try {
      this.loading = true
      await this.getLoginConfiguration()
    } catch (err) {
      console.error(err.message)
      this.cfg.loginTypes = ['token'] // at least allow the token login
    } finally {
      this.loading = false
    }
  },
  mounted () {
    this.loginType = this.primaryLoginType
    if (this.loginType === 'oidc' && this.autoLoginEnabled) {
      this.oidcLogin()
    }
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

  .login-background {
    height: 50%;
    width: 100%;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 0;
  }

  .login-form {
    min-height: 140px;
  }

  .footer {
    position: absolute;
    bottom: 10px;
    left: 0px;
    width: 100%;
    text-align: center;
  }

</style>
