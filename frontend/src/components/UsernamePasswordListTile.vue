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
  <div v-show="!!username && !!password">
    <v-list-tile>
      <v-list-tile-action>
        <v-icon class="cyan--text text--darken-2">perm_identity</v-icon>
      </v-list-tile-action>
      <v-list-tile-content>
        <v-list-tile-sub-title>User</v-list-tile-sub-title>
        <v-list-tile-title>{{username}}</v-list-tile-title>
      </v-list-tile-content>
    </v-list-tile>
    <v-list-tile>
      <v-list-tile-action>
      </v-list-tile-action>
      <v-list-tile-content>
        <v-list-tile-sub-title>Password</v-list-tile-sub-title>
        <v-list-tile-title>{{passwordText}}</v-list-tile-title>
        <v-snackbar :bottom="true" v-model="snackbar" :success="true" :absolute="true" :timeout="2000">
          Copied to clipboard!
        </v-snackbar>
      </v-list-tile-content>
      <v-tooltip top>
        <v-btn slot="activator" icon ref="copy">
          <v-icon>content_copy</v-icon>
        </v-btn>
        <span>Copy to clipboard</span>
      </v-tooltip>
      <v-tooltip top>
        <v-btn slot="activator" icon @click.native.stop="showPassword = !showPassword">
          <v-icon>{{visibilityIcon}}</v-icon>
        </v-btn>
        <span>{{passwordVisibilityTitle}}</span>
      </v-tooltip>
    </v-list-tile>
  </div>
</template>

<script>
import Clipboard from 'clipboard'

export default {
  components: {
    Clipboard
  },
  props: {
    username: {
      type: String
    },
    password: {
      type: String
    }
  },
  data () {
    return {
      snackbar: false,
      showPassword: false,
      clipboard: undefined
    }
  },
  methods: {
    enableCopy () {
      this.clipboard = new Clipboard(this.$refs.copy.$el, {
        text: () => this.password
      })
      this.clipboard.on('success', (event) => {
        this.snackbar = true
      })
    },
    reset () {
      this.snackbar = false
      this.showPassword = false
    }
  },
  computed: {
    passwordText () {
      if (this.showPassword) {
        return this.password
      } else {
        return '****************'
      }
    },
    passwordVisibilityTitle () {
      if (this.showPassword) {
        return 'Hide password'
      } else {
        return 'Show password'
      }
    },
    visibilityIcon () {
      if (this.showPassword) {
        return 'visibility_off'
      } else {
        return 'visibility'
      }
    }
  },
  watch: {
    password (value) {
      this.reset()
    }
  },
  mounted () {
    this.enableCopy()
  }
}
</script>
