   <!--
Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
