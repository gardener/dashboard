<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
  <transition-group name="list">
    <v-layout row v-for="(worker, index) in internalWorkers" :key="worker.id"  class="list-item pt-2">
      <v-flex pa-1 >
        <worker-input-generic :worker.sync="worker" ref="workerInput"
          :workers.sync="internalWorkers"
          :cloudProfileName="cloudProfileName"
          v-if="infrastructureKind === 'aws'">
          <v-btn v-show="index>0 || internalWorkers.length>1"
            small
            slot="action"
            outline
            icon
            class="grey--text lighten-2"
            @click.native.stop="onRemoveWorker(index)">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </worker-input-generic>

        <worker-input-generic :worker.sync="worker" ref="workerInput"
          :workers.sync="internalWorkers"
          :cloudProfileName="cloudProfileName"
          v-if="infrastructureKind === 'azure'">
          <v-btn v-show="index>0 || internalWorkers.length>1"
            small
            slot="action"
            outline
            icon
            class="grey--text lighten-2"
            @click.native.stop="onRemoveWorker(index)">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </worker-input-generic>

        <worker-input-generic :worker.sync="worker" ref="workerInput"
          :workers.sync="internalWorkers"
          :cloudProfileName="cloudProfileName"
          v-if="infrastructureKind === 'gcp'">
          <v-btn v-show="index>0 || internalWorkers.length>1"
            small
            slot="action"
            outline
            icon
            class="grey--text lighten-2"
            @click.native.stop="onRemoveWorker(index)">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </worker-input-generic>

        <worker-input-openstack :worker.sync="worker" ref="workerInput"
          :workers.sync="internalWorkers"
          :cloudProfileName="cloudProfileName"
          v-if="infrastructureKind === 'openstack'">
          <v-btn v-show="index>0 || internalWorkers.length>1"
            small
            slot="action"
            outline
            icon
            class="grey--text lighten-2"
            @click.native.stop="onRemoveWorker(index)">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </worker-input-openstack>

        <worker-input-generic :worker.sync="worker" ref="workerInput"
          :workers.sync="internalWorkers"
          :cloudProfileName="cloudProfileName"
          v-if="infrastructureKind === 'alicloud'">
          <v-btn v-show="index>0 || internalWorkers.length>1"
            small
            slot="action"
            outline
            icon
            class="grey--text lighten-2"
            @click.native.stop="onRemoveWorker(index)">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </worker-input-generic>

      </v-flex>
    </v-layout>
    <v-layout row key="addWorker" class="list-item pt-2">
      <v-flex xs12>
        <v-btn
          small
          @click="addWorker"
          outline
          fab
          icon
          class="cyan darken-2">
          <v-icon class="cyan--text text--darken-2">add</v-icon>
        </v-btn>
        <v-btn
          @click="addWorker"
          flat
          class="cyan--text text--darken-2">
          Add Worker Group
        </v-btn>
      </v-flex>
    </v-layout>
  </transition-group>
</template>

<script>
import WorkerInputGeneric from '@/components/WorkerInputGeneric'
import WorkerInputOpenstack from '@/components/WorkerInputOpenstack'
import { mapGetters } from 'vuex'
import { shortRandomString } from '@/utils'
import isEqual from 'lodash/isEqual'
import forEach from 'lodash/forEach'
import every from 'lodash/every'
import get from 'lodash/get'
import head from 'lodash/head'
import assign from 'lodash/assign'

export default {
  name: 'manage-workers',
  components: {
    WorkerInputGeneric,
    WorkerInputOpenstack
  },
  props: {
    workers: {
      type: Array
    },
    infrastructureKind: {
      type: String
    },
    cloudProfileName: {
      type: String
    }
  },
  data () {
    return {
      internalWorkers: undefined,
      currentID: 0,
      valid: false
    }
  },
  computed: {
    ...mapGetters([
      'cloudProfileByName',
      'machineTypesByCloudProfileName',
      'volumeTypesByCloudProfileName'
    ]),
    machineTypes () {
      return this.machineTypesByCloudProfileName(this.cloudProfileName)
    },
    volumeTypes () {
      return this.volumeTypesByCloudProfileName(this.cloudProfileName)
    }
  },
  methods: {
    id () {
      this.currentID++
      return this.currentID
    },
    clearInternalWorkers () {
      this.currentID = 0 // Worker Ids need to be stable
      this.internalWorkers = []
    },
    setInternalWorkers (workers) {
      this.clearInternalWorkers()
      if (workers) {
        forEach(workers, worker => {
          const id = this.id()
          const internalWorker = assign({}, worker, { id })
          this.internalWorkers.push(internalWorker)
        })
      }
    },
    addWorker () {
      const id = this.id()
      this.internalWorkers.push({
        id,
        name: `worker-${shortRandomString(5)}`,
        machineType: get(head(this.machineTypes), 'name'),
        volumeType: get(head(this.volumeTypes), 'name'),
        volumeSize: '50Gi',
        autoScalerMin: 1,
        autoScalerMax: 2
      })
    },
    onRemoveWorker (index) {
      this.internalWorkers.splice(index, 1)
    },
    setDefaultWorker () {
      this.clearInternalWorkers()
      this.addWorker()
    },
    emitWorkers () {
      const workers = []
      forEach(this.internalWorkers, internalWorker => {
        const worker = assign({}, internalWorker)
        delete worker.id
        workers.push(worker)
      })
      this.$emit('updateWorkers', workers)
    },
    validateWorkers () {
      const workerInput = this.$refs.workerInput

      var workersValid = true
      if (workerInput) {
        const isValid = (element, index, array) => {
          return !element.$v.$invalid
        }
        workersValid = every([].concat(workerInput), isValid)
      }
      this.$emit('valid', workersValid)

      this.valid = workersValid
      return workersValid
    },
    reset () {
      this.setInternalWorkers(this.workers)
    }
  },
  mounted () {
    this.setInternalWorkers(this.workers)
  },
  watch: {
    internalWorkers: {
      deep: true,
      handler (value, oldValue) {
        this.emitWorkers()
        this.$nextTick(() => {
          this.validateWorkers()
        })
      }
    },
    workers: {
      deep: true,
      handler (value, oldValue) {
        if (!isEqual(value, oldValue)) {
          this.setInternalWorkers(value)
        }
      }
    }
  }
}
</script>

<style lang="styl" scoped>

.add_worker{
  margin-left: 30px;
  border: 0;
}
</style>
