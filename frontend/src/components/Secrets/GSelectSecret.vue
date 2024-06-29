<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <v-select
      ref="secret"
      v-model="v$.internalValue.$model"
      color="primary"
      item-color="primary"
      label="Secret"
      :disabled="disabled"
      :items="secretList"
      item-value="metadata.name"
      item-title="metadata.name"
      return-object
      :error-messages="getErrorMessages(v$.internalValue)"
      persistent-hint
      :hint="secretHint"
      variant="underlined"
      @blur="v$.internalValue.$touch()"
    >
      <template #item="{ item, props }">
        <v-list-item
          v-bind="props"
          :title="undefined"
          :subtitle="item.raw.description"
        >
          {{ get(item.raw, 'metadata.name') }}
          <v-icon v-if="!isOwnSecret(item.raw)">
            mdi-share
          </v-icon>
        </v-list-item>
      </template>
      <template #selection="{ item }">
        {{ get(item.raw, 'metadata.name') }}
        <v-icon v-if="!isOwnSecret(item.raw)">
          mdi-share
        </v-icon>
      </template>
      <template #append-item>
        <v-divider class="mb-2" />
        <v-btn
          text
          class="mx-2 text-primary"
          @click="openSecretDialog"
        >
          <v-icon class="mr-2">
            mdi-plus
          </v-icon>
          Add new Secret
        </v-btn>
      </template>
    </v-select>
    <g-secret-dialog-wrapper
      :visible-dialog="visibleSecretDialog"
      @dialog-closed="onSecretDialogClosed"
    />
  </div>
</template>

<script>
import {
  mapState,
  mapActions,
} from 'pinia'
import { toRef } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'

import { useCloudProfileStore } from '@/store/cloudProfile'
import { useAuthzStore } from '@/store/authz'
import { useConfigStore } from '@/store/config'
import { useSecretStore } from '@/store/secret'
import { useProjectStore } from '@/store/project'

import GSecretDialogWrapper from '@/components/Secrets/GSecretDialogWrapper'

import { useProjectCostObject } from '@/composables/useProjectCostObject'
import {
  withParams,
  withMessage,
  withFieldName,
} from '@/utils/validators'
import {
  getErrorMessages,
  isOwnSecret,
  selfTerminationDaysForSecret,
} from '@/utils'

import {
  cloneDeep,
  differenceWith,
  isEqual,
  head,
  get,
  toUpper,
} from '@/lodash'

export default {
  components: {
    GSecretDialogWrapper,
  },
  props: {
    modelValue: {
      type: Object,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    cloudProfileName: {
      type: String,
    },
    dnsProviderKind: {
      type: String,
    },
    registerVuelidateAs: {
      type: String,
    },
  },
  emits: [
    'update:modelValue',
  ],
  setup (props) {
    const projectStore = useProjectStore()

    const projectItem = toRef(projectStore, 'project')
    const {
      costObjectSettingEnabled,
      costObjectTitle,
      costObjectErrorMessage,
    } = useProjectCostObject(projectItem)

    const v$ = useVuelidate({
      $registerAs: props.registerVuelidateAs,
    })

    return {
      costObjectSettingEnabled,
      costObjectTitle,
      costObjectErrorMessage,
      v$,
    }
  },
  data () {
    return {
      secretItemsBeforeAdd: undefined,
      visibleSecretDialog: undefined,
    }
  },
  validations () {
    const projectName = this.projectName
    const costObjectTitle = this.costObjectTitle

    const messageFn = ({ $model }) => {
      return projectName === get($model, 'metadata.projectName')
        ? `${costObjectTitle} is required. Go to the ADMINISTRATION page to edit the project and set the ${costObjectTitle}.`
        : `${costObjectTitle} is required and has to be set on the Project ${toUpper(projectName)}`
    }

    const requiresCostObjectIfEnabled = (enabled = false) => withParams(
      { type: 'requiresCostObjectIfEnabled', enabled },
      function requiresCostObjectIfEnabled (value) {
        return enabled
          ? get(value, 'metadata.hasCostObject', false)
          : true
      },
    )

    return {
      internalValue: withFieldName('Secret', {
        required,
        requiresCostObjectIfEnabled: withMessage(messageFn, requiresCostObjectIfEnabled(this.costObjectSettingEnabled)),
      }),
    }
  },
  computed: {
    ...mapState(useAuthzStore, [
      'namespace',
    ]),
    projectName () {
      return this.projectNameByNamespace(this.namespace)
    },
    internalValue: {
      get () {
        return this.modelValue
      },
      set (value) {
        this.$emit('update:modelValue', value)
      },
    },
    secretList () {
      if (this.cloudProfileName) {
        return this.infrastructureSecretsByCloudProfileName(this.cloudProfileName)
      }
      if (this.dnsProviderKind) {
        return this.dnsSecretsByProviderKind(this.dnsProviderKind)
      }
      return []
    },
    infrastructureKind () {
      if (this.dnsProviderKind) {
        return this.dnsProviderKind
      }

      if (!this.cloudProfileName) {
        return undefined
      }

      const cloudProfile = this.cloudProfileByName(this.cloudProfileName)
      if (!cloudProfile) {
        return undefined
      }
      return cloudProfile.metadata.cloudProviderKind
    },
    secretHint () {
      if (this.selfTerminationDays) {
        return `The selected secret has an associated quota that will cause the cluster to self terminate after ${this.selfTerminationDays} days`
      }
      return undefined
    },
    selfTerminationDays () {
      return selfTerminationDaysForSecret(this.internalValue)
    },
  },
  mounted () {
    this.v$.internalValue.$touch()
  },
  methods: {
    ...mapActions(useCloudProfileStore, [
      'cloudProfileByName',
    ]),
    ...mapActions(useProjectStore, [
      'projectNameByNamespace',
    ]),
    ...mapActions(useSecretStore, [
      'infrastructureSecretsByCloudProfileName',
      'dnsSecretsByProviderKind',
    ]),
    get,
    isOwnSecret,
    openSecretDialog () {
      this.visibleSecretDialog = this.infrastructureKind
      this.secretItemsBeforeAdd = cloneDeep(this.secretList)
    },
    onSecretDialogClosed () {
      this.visibleSecretDialog = undefined
      const value = head(differenceWith(this.secretList, this.secretItemsBeforeAdd, isEqual))
      if (value) {
        this.internalValue = value
      }
    },
    getErrorMessages,
  },
}
</script>
