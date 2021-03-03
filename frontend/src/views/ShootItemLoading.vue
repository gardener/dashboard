   <!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->
<template>
  <v-container fluid class="fill-height text-center">
    <v-row align="center" justify="center">
        <v-card tile flat :class="!darkMode ? 'grey lighten-5': ''">
          <v-card-title class="text-subtitle-1">
            Loading cluster {{$route.params.name}}
          </v-card-title>
          <v-card-text>
            <v-progress-linear
              color="primary"
              indeterminate
              height="8"
            ></v-progress-linear>
          </v-card-text>
        </v-card>
    </v-row>
  </v-container>
</template>

<script>
import { mapState } from 'vuex'

export default {
  name: 'shoot-item-loading',
  computed: {
    ...mapState([
      'darkMode'
    ])
  }
}
</script>
