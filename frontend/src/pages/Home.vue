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
  <v-container fluid>
    <v-card class="mt-2">
      <v-card-text>
        <h3>Let's get started</h3>
        <v-btn @click.native.stop="projectDialog = true">
          <v-icon class="red--text text--darken-2">mdi-plus</v-icon> Create your first Project
        </v-btn>
      </v-card-text>
      <project-create-dialog @submit="onProjectCreated" v-model="projectDialog">
      </project-create-dialog>
    </v-card>
  </v-container>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import ProjectCreateDialog from '@/dialogs/ProjectDialog'

export default {
  name: 'profile',
  components: {
    ProjectCreateDialog
  },
  data () {
    return {
      projectDialog: false,
      projectMenu: false
    }
  },
  computed: {
    ...mapState([
      'user'
    ]),
    ...mapGetters([
      'username',
      'namespaces'
    ])
  },
  methods: {
    onProjectCreated ({ metadata } = {}) {
      const name = 'ShootList'
      let namespace = metadata.namespace
      if (!namespace) {
        namespace = this.namespaces[0]
      }
      if (namespace) {
        this.$router.push({ name, params: { namespace } })
      }
    }
  }
}
</script>
