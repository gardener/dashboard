   <!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->
<template>
  <v-container fluid class="fill-height text-center">
    <v-row align="center" justify="center">
        <v-card tile flat>
          <v-card-title class="text-subtitle-1 grey--text text--darken-2">
            Loading cluster {{$route.params.name}}
          </v-card-title>
          <v-card-text>
            <v-progress-linear
              color="cyan darken-2"
              indeterminate
              height="8"
            ></v-progress-linear>
          </v-card-text>
        </v-card>
    </v-row>
  </v-container>
</template>
