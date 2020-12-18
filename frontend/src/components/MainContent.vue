<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-main>
    <g-alert :message="alertBannerMessage" :type="alertBannerType" :identifier="alertBannerIdentifier"></g-alert>
    <router-view :key="key"></router-view>
  </v-main>
</template>

<script>
import set from 'lodash/set'
import GAlert from '@/components/GAlert'
import { mapGetters } from 'vuex'

function setElementStyle (element, key, value) {
  if (element) {
    set(element.style, key, value)
  }
}

function setElementOverflowY (element, value) {
  setElementStyle(element, 'overflowY', value)
}

function setWrapElementHeight (element, value) {
  setElementStyle(element, 'height', `calc(100vh - ${value}px)`)
}

export default {
  name: 'main-content',
  components: {
    GAlert
  },
  computed: {
    ...mapGetters([
      'alertBannerMessage',
      'alertBannerType',
      'alertBannerIdentifier'
    ]),
    key () {
      if (this.$route.name !== 'ShootItemTerminal') {
        return undefined
      }
      return this.$route.path
    }

  },
  methods: {
    getWrapElement () {
      return this.$el.querySelector(':scope > div[class$="wrap"]')
    },
    setScrollTop (top = 0) {
      const element = this.getWrapElement()
      set(element, 'scrollTop', top)
    }
  },
  watch: {
    '$vuetify.application.top' (value) {
      const element = this.getWrapElement()
      setWrapElementHeight(element, value)
    }
  },
  mounted () {
    setElementOverflowY(this.$el, 'hidden')
    const element = this.getWrapElement()
    setElementOverflowY(element, 'auto')
    setWrapElementHeight(element, this.$vuetify.application.top)
  }
}
</script>
