<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-app>
    <div class="login-background bg-main-background" />
    <v-main>
      <v-container
        class="fill-height"
        fluid
      >
        <v-row
          align="center"
          justify="center"
        >
          <v-col
            cols="12"
            sm="8"
            md="4"
            lg="4"
          >
              <v-card class="elevation-1">
                <v-card-title class="pa-0 d-flex flex-column">
                  <div class="d-flex flex-column align-center bg-main-background-darken-1 text-primary pa-3 pt-6">
                    <img
                      src="/static/assets/logo.svg"
                      alt="Login to Gardener"
                      width="180"
                      height="180"
                    >
                    <div class="flex my-4 text-primary text-h5 font-weight-light title-text">
                      Universal Kubernetes at Scale
                    </div>
                  </div>
                  <v-tabs
                    v-if="!isFetching"
                    v-model="loginType"
                    align-tabs="center"
                    color="primary"
                  >
                    <v-tab
                      v-for="item in loginTypes"
                      :key="item"
                      :value="item"
                    >
                      {{ item }}
                    </v-tab>
                  </v-tabs>
                </v-card-title>
                <v-card-text class="login-form py-0">
                  <v-window
                    v-if="!isFetching"
                    v-model="loginType"
                    class="pa-4"
                  >
                    <v-window-item value="oidc">
                      <div class="text-subtitle-1 text-center text-medium-emphasis">
                        Press Login to be redirected to configured<br> OpenID Connect Provider.
                      </div>
                    </v-window-item>
                    <v-window-item value="token">
                      <div class="text-subtitle-1 text-center text-medium-emphasis pb-3">
                        Enter a bearer token trusted by the Kubernetes API server and press Login.
                      </div>
                      <v-form autocomplete="off">
                        <v-text-field
                          ref="tokenField"
                          v-model="token"
                          color="primary"
                          :append-inner-icon="showToken ? 'mdi-eye' : 'mdi-eye-off'"
                          :type="showToken ? 'text' : 'password'"
                          variant="solo"
                          label="Token"
                          required
                          @click:append-inner="showToken = !showToken"
                          hide-details="auto"
                        />
                      </v-form>
                    </v-window-item>
                  </v-window>
                </v-card-text>
                <v-card-actions
                  v-show="!isFetching"
                  class="py-4"
                >
                  <div class="d-flex justify-center flex-grow-1">
                    <v-btn
                      variant="elevated"
                      color="primary"
                      @click="handleLogin"
                    >
                      Login
                    </v-btn>
                  </div>
                </v-card-actions>
              </v-card>
          </v-col>
        </v-row>
      </v-container>
      <div v-if="landingPageUrl"
        class="footer text-caption"
      >
        <span class="text-primary">
          Discover what our service is about at the
        </span>
        <a
          :href="landingPageUrl"
          target="_blank"
          rel="noopener"
          class="text-anchor"
        >Gardener Landing Page</a>
      </div>
    </v-main>
    <g-notify/>
  </v-app>
</template>

<script setup>
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useRouteQuery } from '@vueuse/router'

import { useApi } from '@/composables'
import { useAppStore, useAuthnStore, useLoginStore } from '@/store'
import { setDelayedInputFocus } from '@/utils'
import GNotify from '@/components/GNotify.vue'

const router = useRouter()
const appStore = useAppStore()
const authnStore = useAuthnStore()
const loginStore = useLoginStore()
const api = useApi()

const showToken = ref(false)
const token = ref('')
const tokenField = ref(null)
const { isFetching, loginType, loginTypes, landingPageUrl } = storeToRefs(loginStore)

const redirectPath = useRouteQuery('redirectPath', '/')

function handleLogin () {
  switch (loginType.value) {
    case 'oidc':
      oidcLogin()
      break
    case 'token':
      tokenLogin()
      break
  }
}

function oidcLogin () {
  try {
    authnStore.signinWithOidc(redirectPath.value)
  } catch (err) {
    appStore.alert = {
      type: 'error',
      title: 'OIDC Login Error',
      message: err.message,
    }
  }
}

async function tokenLogin () {
  try {
    const value = token.value
    token.value = undefined
    await api.createTokenReview({ token: value })
    try {
      await router.push(redirectPath.value)
    } catch (err) {
      /* Catch and ignore navigation aborted errors. Redirection happens in navigation guards
        * (see https://router.vuejs.org/guide/essentials/navigation.html#router-push-location-oncomplete-onabort).
        */
    }
  } catch (err) {
    appStore.alert = {
      message: err.message,
      title: 'Token Login Error',
      type: 'error',
    }
  }
}

watch(loginType, value => {
  if (value === 'token') {
    setDelayedInputFocus(tokenField)
  }
})
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

  .title-text {
    white-space: normal;
    word-break: break-word;
  }
</style>
