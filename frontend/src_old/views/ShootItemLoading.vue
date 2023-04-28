   <!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->
<template>
  <v-container fluid class="fill-height text-center">
    <v-row align="center" justify="center">
        <v-card rounded="0" flat class="title-background">
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

export default {
  name: 'shoot-item-loading'
}
</script>

<style lang="scss" scoped>
  .theme--light .title-background {
    background-color: rgba(0, 0, 0, .02);
  }
</style>
