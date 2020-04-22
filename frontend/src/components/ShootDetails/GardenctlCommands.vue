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
  <div>
    <div v-for="({ title, subtitle, value }, index) in commands" :key="title">
      <gardenctl-command
        :title="title"
        :subtitle="subtitle"
        :value="value"
        :isFirstItem="index === 0"
      ></gardenctl-command>
    </div>
  </div>
</template>

<script>
import GardenctlCommand from '@/components/ShootDetails/GardenctlCommand'
import { shootItem } from '@/mixins/shootItem'
import { mapState, mapGetters } from 'vuex'
import get from 'lodash/get'

export default {
  components: {
    GardenctlCommand
  },
  props: {
    shootItem: {
      type: Object
    }
  },
  mixins: [shootItem],
  computed: {
    ...mapState([
      'cfg'
    ]),
    ...mapGetters([
      'projectFromProjectList'
    ]),
    projectName () {
      const project = this.projectFromProjectList
      return get(project, 'metadata.name')
    },
    commands () {
      return [
        {
          title: 'Target Control Plane',
          subtitle: 'Gardenctl command to target the shoot namespace on the seed cluster',
          value: this.targetSeedCommand
        },
        {
          title: 'Target Cluster',
          subtitle: 'Gardenctl command to target the shoot cluster',
          value: this.targetShootCommand
        }
      ]
    },
    targetSeedCommand () {
      const args = []
      if (this.cfg.apiServerUrl) {
        args.push(`--server ${this.cfg.apiServerUrl}`)
      }
      if (this.shootSeedName) {
        args.push(`--seed ${this.shootSeedName}`)
      }
      if (this.shootTechnicalId) {
        args.push(`--namespace ${this.shootTechnicalId}`)
      }

      return `gardenctl target ${args.join(' ')}`
    },
    targetShootCommand () {
      const args = []
      if (this.cfg.apiServerUrl) {
        args.push(`--server ${this.cfg.apiServerUrl}`)
      }
      if (this.projectName) {
        args.push(`--project ${this.projectName}`)
      }
      if (this.shootName) {
        args.push(`--shoot ${this.shootName}`)
      }

      return `gardenctl target ${args.join(' ')}`
    }
  }
}
</script>
