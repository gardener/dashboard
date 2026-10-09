<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-container class="pa-0 ma-0">
    <v-row>
      <v-col cols="3">
        <g-select-cloud-profile
          ref="cloudProfile"
          v-model="cloudProfileRef"
          :cloud-profiles="cloudProfiles"
          color="primary"
        />
      </v-col>
      <v-col
        v-if="!workerless"
        cols="3"
      >
        <g-select-credential
          v-model="infrastructureBinding"
          :provider-type="providerType"
          vendor-type="infra"
        />
      </v-col>
      <v-col cols="3">
        <v-select
          v-model="v$.region.$model"
          color="primary"
          item-color="primary"
          label="Region"
          :items="regionItems"
          :hint="regionHint"
          persistent-hint
          :error-messages="getErrorMessages(v$.region)"
          variant="underlined"
          @blur="v$.region.$touch()"
        >
          <template #item="{ item, props }">
            <!-- Divider / header in items not implemented yet in Vuetify 3: https://github.com/vuetifyjs/vuetify/issues/15721 -->
            <v-list-subheader v-if="!!item.header">
              {{ item.header }}
            </v-list-subheader>
            <v-list-item
              v-else
              v-bind="props"
            />
          </template>
        </v-select>
      </v-col>
      <v-col
        v-if="!workerless"
        cols="3"
      >
        <v-select
          v-model="v$.networkingType.$model"
          color="primary"
          item-color="primary"
          label="Networking Type"
          :items="networkingTypes"
          persistent-hint
          :error-messages="getErrorMessages(v$.networkingType)"
          variant="underlined"
          @blur="v$.networkingType.$touch()"
        />
      </v-col>
      <component
        :is="createInfrastructureDetailsComponent"
        v-if="createInfrastructureDetailsComponent"
      />
    </v-row>
  </v-container>
</template>

<script>
import {
  required,
  requiredIf,
} from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'

import GSelectCloudProfile from '@/components/GSelectCloudProfile'
import GSelectCredential from '@/components/Credentials/GSelectCredential'

import { useShootContext } from '@/composables/useShootContext'

import { getInfrastructureProviderUi } from '@/providers/infra/ui'
import { getErrorMessages } from '@/utils'
import { withFieldName } from '@/utils/validators'

import forEach from 'lodash/forEach'
import includes from 'lodash/includes'
import isEmpty from 'lodash/isEmpty'

export default {
  components: {
    GSelectCloudProfile,
    GSelectCredential,
  },
  setup () {
    const {
      providerType,
      cloudProfileRef,
      infrastructureBinding,
      region,
      networkingType,
      cloudProfiles,
      infrastructureBindings,
      regionsWithSeed,
      regionsWithoutSeed,
      showAllRegions,
      networkingTypes,
      workerless,
    } = useShootContext()

    return {
      v$: useVuelidate(),
      providerType,
      infrastructureBinding,
      cloudProfileRef,
      region,
      networkingType,
      cloudProfiles,
      infrastructureBindings,
      regionsWithSeed,
      regionsWithoutSeed,
      showAllRegions,
      networkingTypes,
      workerless,
    }
  },
  validations () {
    return {
      region: withFieldName('Region', {
        required,
      }),
      networkingType: withFieldName('Networking Type', {
        required: requiredIf(() => !this.workerless),
      }),
    }
  },
  computed: {
    regionItems () {
      const regionItems = []
      if (!isEmpty(this.regionsWithSeed)) {
        regionItems.push({ header: 'Recommended Regions (API servers in same region)' })
      }
      forEach(this.regionsWithSeed, region => {
        regionItems.push(region)
      })
      if (this.showAllRegions && !isEmpty(this.regionsWithoutSeed)) {
        regionItems.push({ header: 'Supported Regions (API servers in another region)' })
        forEach(this.regionsWithoutSeed, region => {
          regionItems.push(region)
        })
      }
      return regionItems
    },
    regionHint () {
      if (includes(this.regionsWithSeed, this.region)) {
        return 'API servers in same region as your workers (optimal if you require a low latency)'
      }
      return 'API servers in another region than your workers (expect a somewhat higher latency; picked by Gardener based on internal considerations such as geographic proximity)'
    },
    createInfrastructureDetailsComponent () {
      return getInfrastructureProviderUi(this.providerType)?.createInfrastructureDetailsComponent
    },
  },
  methods: {
    getErrorMessages,
  },
}
</script>
