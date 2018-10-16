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
  <v-dialog v-model="loading" lazy persistent absolute content-class="dialog--loading" max-width="100">
    <v-container text-xs-center>
      <v-layout row>
        <v-flex xs12>
          <v-progress-circular indeterminate :size="50" class="primary--text"></v-progress-circular>
        </v-flex>
      </v-layout>
    </v-container>
  </v-dialog>
</template>

<script>
import { mapState } from 'vuex'

export default {
  name: 'loading',
  computed: {
    ...mapState([
      'loading'
    ])
  }
}
</script>

<style lang="styl">
  .dialog--loading {
    box-shadow: none;
    border-radius: 0;
    overflow: hidden;
  }
</style>
