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
        <shoot-details-card :shootItem="shootItem"></shoot-details-card>

        <shoot-infrastructure-card :shootItem="shootItem" class="mt-3"></shoot-infrastructure-card>

        <shoot-external-tools-card :shootItem="shootItem" class="mt-3"></shoot-external-tools-card>

        <shoot-lifecycle-card ref="shootLifecycle" :shootItem="shootItem" class="mt-3"></shoot-lifecycle-card>
      </v-flex>

      <v-flex md6>
        <v-card v-if="canRenderControlPlane" class="mb-3">
          <v-card-title class="subheading white--text cyan darken-2">
            Control Plane
          </v-card-title>
          <shoot-control-plane :shootItem="shootItem"></shoot-control-plane>
        </v-card>

        <v-card v-if="canGetSecrets" class="mb-3">
          <v-card-title class="subheading white--text cyan darken-2">
            Access
          </v-card-title>
          <shoot-access-card :shootItem="shootItem"></shoot-access-card>
        </v-card>

        <shoot-monitoring-card :shootItem="shootItem"></shoot-monitoring-card>

        <v-card v-show="isLoggingFeatureGateEnabled">
          <v-card-title class="subheading white--text cyan darken-2 mt-3">
            Logging
          </v-card-title>
          <shoot-logging :shootItem="shootItem"></shoot-logging>
        </v-card>

        <v-card v-if="isKymaFeatureEnabled && isKymaAddonEnabled">
          <v-card-title class="subheading white--text cyan darken-2 mt-3">
            {{kymaTitle}}
          </v-card-title>
          <shoot-addon-kyma-card :shootItem="shootItem"></shoot-addon-kyma-card>
        </v-card>

        <shoot-journals-card v-if="isAdmin" :journals="journals" :shootItem="shootItem" class="mt-3"></shoot-journals-card>

      </v-flex>

    </v-layout>

  </v-container>

</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import ShootControlPlane from '@/components/ShootDetails/ShootControlPlane'
import ShootAccessCard from '@/components/ShootDetails/ShootAccessCard'
import ShootAddonKymaCard from '@/components/ShootDetails/ShootAddonKymaCard'
import ShootJournalsCard from '@/components/ShootDetails/ShootJournalsCard'
import ShootMonitoringCard from '@/components/ShootDetails/ShootMonitoringCard'
import ShootLogging from '@/components/ShootDetails/ShootLogging'
import ShootDetailsCard from '@/components/ShootDetails/ShootDetailsCard'
import ShootInfrastructureCard from '@/components/ShootDetails/ShootInfrastructureCard'
import ShootLifecycleCard from '@/components/ShootDetails/ShootLifecycleCard'
import ShootExternalToolsCard from '@/components/ShootDetails/ShootExternalToolsCard'
import get from 'lodash/get'
import has from 'lodash/has'
import isEmpty from 'lodash/isEmpty'
import { shootAddonByName } from '@/utils'
import { shootItem } from '@/mixins/shootItem'

import 'codemirror/mode/yaml/yaml.js'

export default {
  name: 'shoot-item',
  components: {
    ShootControlPlane,
    ShootDetailsCard,
    ShootInfrastructureCard,
    ShootLifecycleCard,
    ShootAccessCard,
    ShootAddonKymaCard,
    ShootJournalsCard,
    ShootMonitoringCard,
    ShootLogging,
    ShootExternalToolsCard
  },
  mixins: [shootItem],
  computed: {
    ...mapGetters([
      'shootByNamespaceAndName',
      'journalsByNamespaceAndName',
      'isAdmin',
      'hasControlPlaneTerminalAccess',
      'isKymaFeatureEnabled',
      'canGetSecrets'
    ]),
    value () {
      return this.shootByNamespaceAndName(this.$route.params)
    },
    info () {
      return get(this, 'value.info', {})
    },
    seedInfo () {
      return get(this, 'value.seedInfo', {})
    },
    shootItem () {
      return get(this, 'value', {})
    },
    isLoggingFeatureGateEnabled () {
      const userCredentialsAvailable = !!this.info.logging_username && !!this.info.logging_password
      const adminCredentialsAvailable = !!this.seedInfo.logging_username && !!this.seedInfo.logging_password
      return userCredentialsAvailable || adminCredentialsAvailable
    },
    journals () {
      const params = this.$route.params
      return this.journalsByNamespaceAndName(params)
    },
    canRenderControlPlane () {
      return !isEmpty(this.shootItem) && this.hasControlPlaneTerminalAccess
    },
    isKymaAddonEnabled () {
      return has(this.shootItem, 'metadata.annotations["experimental.addons.shoot.gardener.cloud/kyma"]')
    },
    kymaTitle () {
      const kymaAddon = shootAddonByName('kyma')
      return get(kymaAddon, 'title')
    }
  },
  methods: {
    ...mapActions([
      'getShootAddonKyma'
    ]),
    fetchKymaInfo () {
      if (!this.isKymaFeatureEnabled || !this.isKymaAddonEnabled) {
        return
      }

      this.getShootAddonKyma({ name: this.shootName, namespace: this.shootNamespace })
    }
  },
  mounted () {
    if (get(this.$route, 'name') === 'ShootItemHibernationSettings') {
      this.$refs.shootLifecycle.showHibernationConfigurationDialog()
    }
    this.fetchKymaInfo()
  },
  watch: {
    isKymaAddonEnabled () {
      this.fetchKymaInfo()
    }
  }
}
</script>

<style lang="styl" scoped>
  .subheading.v-card__title {
    line-height: 10px;
  }
</style>
