<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-app
    :style="{
      minHeight: `${appHeight}px`
    }"
  >
    <v-main
      class="d-flex flex-column align-center justify-space-between"
      style="height: 100vh;"
    >
      <v-sheet
        :min-height="footerHeight"
        class="bg-transparent"
      />
      <v-sheet
        :min-height="totalTeaserHeight"
        :min-width="teaserMinWidth"
        :width="teaserWidth"
        :elevation="2"
        rounded
        class="overflow-hidden"
      >
        <g-login-teaser
          :min-height="teaserHeight"
        />
        <v-tabs
          v-model="loginType"
          align-tabs="center"
          color="primary"
          :height="tabsHeight"
        >
          <v-tab
            v-for="key in loginTypes"
            :key="key"
            :value="key"
            :text="getLoginTypeTitle(key)"
          />
        </v-tabs>
        <v-window
          v-model="loginType"
          :style="{
            height: `${windowHeight}px`,
          }"
        >
          <v-window-item
            value="oidc"
            class="pa-3"
            style="{
              height: `${windowHeight}px`,
            }"
          >
            <!-- eslint-disable vue/no-v-html -->
            <div
              class="text-subtitle-1 text-center text-medium-emphasis"
              v-html="oidcLoginText"
            />
            <!-- eslint-enable vue/no-v-html -->
          </v-window-item>
          <v-window-item
            value="token"
            class="pa-3"
            style="{
              height: `${windowHeight}px`,
            }"
          >
            <!-- eslint-disable vue/no-v-html -->
            <div
              class="text-subtitle-1 text-center text-medium-emphasis"
              v-html="tokenLoginText"
            />
            <!-- eslint-enable vue/no-v-html -->
            <div class="d-flex justify-center mt-3">
              <v-text-field
                ref="tokenField"
                v-model="token"
                color="primary"
                :append-inner-icon="showToken ? 'mdi-eye' : 'mdi-eye-off'"
                :type="showToken ? 'text' : 'password'"
                variant="solo"
                single-line
                density="compact"
                label="Token"
                required
                hide-details="auto"
                autocomplete="off"
                :style="{
                  maxWidth: `${teaserWidth - 96}px`,
                }"
                @click:append-inner="showToken = !showToken"
                @keydown.enter="handleLogin"
              />
            </div>
          </v-window-item>
        </v-window>
        <div
          class="d-flex align-center justify-center"
          :style="{
            minHeight: `${toolbarHeight}px`
          }"
        >
          <v-btn
            ref="loginButton"
            variant="elevated"
            color="primary"
            @click="handleLogin"
          >
            Login
          </v-btn>
        </div>
        <g-login-hints
          :min-height="hintsMinHeight"
        />
      </v-sheet>
      <v-sheet
        :min-height="footerHeight"
        class="bg-transparent"
      >
        <g-login-footer />
      </v-sheet>
    </v-main>
    <g-notify />
  </v-app>
</template>

<script>
import {
  mapState,
  mapWritableState,
  mapActions,
} from 'pinia'

import { useAppStore } from '@/store/app'
import { useAuthnStore } from '@/store/authn'
import { useLoginStore } from '@/store/login'
import { useLocalStorageStore } from '@/store/localStorage'

import GLoginTeaser from '@/components/GLoginTeaser.vue'
import GLoginHints from '@/components/GLoginHints.vue'
import GLoginFooter from '@/components/GLoginFooter.vue'
import GNotify from '@/components/GNotify.vue'

import { setDelayedInputFocus } from '@/utils'

import { get } from '@/lodash'

export default {
  components: {
    GLoginTeaser,
    GLoginHints,
    GLoginFooter,
    GNotify,
  },
  inject: ['api'],
  async beforeRouteEnter (to, from, next) {
    let err
    if (/^#.+/.test(to.hash)) {
      const searchParams = new URLSearchParams(to.hash.substring(1))
      if (searchParams.has('error')) {
        err = new Error(searchParams.get('error'))
        err.title = searchParams.get('title') ?? 'Login Error'
      }
    }

    const loginStore = useLoginStore()
    const localStorageStore = useLocalStorageStore()
    await loginStore.fetchConfig()
    if (!err && loginStore.loginType === 'oidc' && localStorageStore.autoLogin) {
      const redirectPath = get(to.query, 'redirectPath', '/')
      const authnStore = useAuthnStore()
      authnStore.signinWithOidc(redirectPath)
      return next(false)
    }

    next(vm => {
      if (err) {
        if (err.message !== 'NoAutoLogin') {
          vm.setError(err)
        }
        vm.$router.replace('/login')
      }
    })
  },
  data () {
    return {
      showToken: false,
      token: '',
    }
  },
  computed: {
    ...mapState(useLoginStore, [
      'loginTypes',
      'landingPageUrl',
      'branding',
    ]),
    ...mapWritableState(useLoginStore, [
      'loginType',
    ]),
    breakpointName () {
      return this.$vuetify.display.name
    },
    tabsHeight () {
      return this.branding.loginTabsHeight ?? 48
    },
    windowHeight () {
      return this.branding.loginTabsContentHeight ?? 136
    },
    toolbarHeight () {
      return this.branding.loginToolbarHeight ?? 60
    },
    hintsMinHeight () {
      return this.branding.loginHintsMinHeight ?? 38
    },
    teaserMinWidth () {
      return this.branding.loginTeaserMinWidth ?? 340
    },
    teaserHeight () {
      return this.branding.loginTeaserHeight ?? 260
    },
    footerHeight () {
      return this.branding.loginFooterHeight ?? 24
    },
    totalTeaserHeight () {
      return this.teaserHeight + this.tabsHeight + this.windowHeight + this.toolbarHeight
    },
    windowItemHeight () {
      return this.windowHeight - 24
    },
    appHeight () {
      return this.totalTeaserHeight + 2 * this.footerHeight
    },
    teaserWidth () {
      switch (this.breakpointName) {
        case 'xs':
          return this.calculateWidth(0)
        case 'sm':
        case 'md':
          return this.calculateWidth(1)
        default:
          return this.calculateWidth(2)
      }
    },
    redirectPath () {
      return get(this.$route.query, 'redirectPath', '/')
    },
    oidcLoginText () {
      const value = this.branding.oidcLoginText ?? 'Press Login to be redirected to the configured\nOpenID Connect Provider.'
      return value.replace(/\n/g, '<br>')
    },
    tokenLoginText () {
      const value = this.branding.tokenLoginText ?? 'Enter a bearer token trusted by the Kubernetes API server and press Login.'
      return value.replace(/\n/g, '<br>')
    },
  },
  watch: {
    loginType: {
      async handler (value) {
        if (value === 'token') {
          setDelayedInputFocus(this, 'tokenField')
        }
        if (value === 'oidc') {
          await this.$nextTick()
          this.$refs.loginButton.$el.focus()
        }
      },
      immediate: true,
    },
  },
  methods: {
    ...mapActions(useAppStore, [
      'setError',
    ]),
    ...mapActions(useAuthnStore, [
      'signinWithOidc',
    ]),
    calculateWidth (i) {
      return this.teaserMinWidth + i * 60
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
    getLoginTypeTitle (key) {
      switch (key) {
        case 'oidc':
          return this.branding.oidcLoginTitle ?? 'OIDC'
        case 'token':
          return this.branding.tokenLoginTitle ?? 'Token'
        default:
          return key
      }
    },
    oidcLogin () {
      try {
        this.signinWithOidc(this.redirectPath)
      } catch (err) {
        this.setError({
          title: `${this.getLoginTypeTitle('oidc')} Login Error`,
          message: err.message,
        })
      }
    },
    async tokenLogin () {
      try {
        const token = this.token
        this.token = undefined
        await this.api.createTokenReview({ token })
        try {
          await this.$router.push(this.redirectPath)
        } catch (err) {
          /* Catch and ignore navigation aborted errors. Redirection happens in navigation guards */
        }
      } catch (err) {
        this.setError({
          title: `${this.getLoginTypeTitle('token')} Login Error`,
          message: err.message,
        })
      }
    },
  },
}
</script>

<style lang="scss" scoped>
  $bg-top: rgb(var(--v-theme-main-background));
  $bg-bottom: rgb(var(--v-theme-background));

  .v-application {
    background: linear-gradient(to bottom, $bg-top 0%, $bg-top 50%, $bg-bottom 50%, $bg-bottom 100%) !important;
  }
</style>
