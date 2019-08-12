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

  <v-container fluid grid-list-lg>
    <v-layout d-flex wrap row>
      <v-flex md6>
        <shoot-details-card :shootItem="item"></shoot-details-card>

        <shoot-infrastructure-card :shootItem="item" class="mt-3"></shoot-infrastructure-card>

        <shoot-lifecycle-card ref="shootLifecycle" :shootItem="item" class="mt-3"></shoot-lifecycle-card>
      </v-flex>

      <v-flex md6>
        <v-card>
          <v-card-title class="subheading white--text cyan darken-2">
            Access
          </v-card-title>
          <cluster-access :shootItem="item"></cluster-access>
        </v-card>

        <monitoring-card :shootItem="item" class="mt-3"></monitoring-card>

        <v-card v-show="isLoggingFeatureGateEnabled">
          <v-card-title class="subheading white--text cyan darken-2 mt-3">
            Logging
          </v-card-title>
          <logging :shootItem="item"></logging>
        </v-card>

        <journals v-if="isAdmin" :journals="journals" :shootItem="item" class="mt-3"></journals>

      </v-flex>

    </v-layout>

  </v-container>

</template>

<script>
import { mapGetters } from 'vuex'
import ClusterAccess from '@/components/ClusterAccess'
import Journals from '@/components/Journals'
import MonitoringCard from '@/components/MonitoringCard'
import Logging from '@/components/Logging'
import ShootDetailsCard from '@/components/ShootDetailsCard'
import ShootInfrastructureCard from '@/components/ShootInfrastructureCard'
import ShootLifecycleCard from '@/components/ShootLifecycleCard'
import get from 'lodash/get'

import 'codemirror/mode/yaml/yaml.js'

export default {
  name: 'shoot-item',
  components: {
    ShootDetailsCard,
    ShootInfrastructureCard,
    ShootLifecycleCard,
    ClusterAccess,
    Journals,
    MonitoringCard,
    Logging
  },
  computed: {
    ...mapGetters([
      'shootByNamespaceAndName',
      'journalsByNamespaceAndName',
      'isAdmin'
    ]),
    value () {
      return this.shootByNamespaceAndName(this.$route.params)
    },
    info () {
      return get(this, 'value.info', {})
    },
    item () {
      return get(this, 'value', {})
    },
    isLoggingFeatureGateEnabled () {
      return !!this.info.logging_username && !!this.info.logging_password
    },
    journals () {
      const params = this.$route.params
      return this.journalsByNamespaceAndName(params)
    }
  },
  mounted () {
    if (get(this.$route, 'name') === 'ShootItemHibernationSettings') {
      this.$refs.shootLifecycle.showHibernationConfigurationDialog()
    }
  }
}
</script>

<style lang="styl" scoped>
  .subheading.v-card__title {
    line-height: 10px;
  }
</style>
