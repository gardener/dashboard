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
  <div>
    <v-tooltip top>
      <v-btn icon slot="activator" :disabled="isShootMarkedForDeletion" @click="showDialog">
        <v-icon>delete</v-icon>
      </v-btn>
      <span>{{caption}}</span>
    </v-tooltip>
    <delete-cluster-dialog v-model="dialog" @close="hideDialog" :clusterName="shootName" :clusterNamespace="shootNamespace" :clusterCreatedBy="createdBy"></delete-cluster-dialog>
  </div>
</template>

<script>
import DeleteClusterDialog from '@/dialogs/DeleteClusterDialog'
import get from 'lodash/get'
import {
  getCreatedBy,
  isShootMarkedForDeletion
} from '@/utils'

export default {
  components: {
    DeleteClusterDialog
  },
  props: {
    shootItem: {
      type: Object
    }
  },
  data () {
    return {
      dialog: false
    }
  },
  computed: {
    icon () {
      return 'mdi-delete'
    },
    caption () {
      return this.isShootMarkedForDeletion
        ? 'Cluster already marked for deletion'
        : 'Delete Cluster'
    },
    shootName () {
      return get(this.shootItem, 'metadata.name')
    },
    shootNamespace () {
      return get(this.shootItem, 'metadata.namespace')
    },
    createdBy () {
      return getCreatedBy(get(this.shootItem, 'metadata'))
    },
    isShootMarkedForDeletion () {
      return isShootMarkedForDeletion(get(this.shootItem, 'metadata'))
    }
  },
  methods: {
    showDialog () {
      this.dialog = true
    },
    hideDialog () {
      this.dialog = false
    }
  }
}
</script>
