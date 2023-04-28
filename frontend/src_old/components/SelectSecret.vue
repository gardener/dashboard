<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <v-select
      ref="secret"
      color="primary"
      item-color="primary"
      label="Secret"
      :disabled="disabled"
      :items="secretList"
      item-value="metadata.name"
      return-object
      v-model="secret"
      :error-messages="getErrorMessages('secret')"
      @update:model-value="$v.secret.$touch()"
      @blur="$v.secret.$touch()"
      persistent-hint
      :hint="secretHint"
      >
      <template v-slot:item="{ item }">
        {{get(item, 'metadata.name')}}
        <v-icon v-if="!isOwnSecret(item)">mdi-share</v-icon>
      </template>
      <template v-slot:selection="{ item }">
        {{get(item, 'metadata.name')}}
        <v-icon v-if="!isOwnSecret(item)">mdi-share</v-icon>
      </template>
      <template v-slot:append-item>
        <v-divider class="mb-2"></v-divider>
        <v-btn variant="text" @click="openSecretDialog" class="mx-2 text-primary">
          <v-icon class="mr-2">mdi-plus</v-icon>
          Add new Secret
        </v-btn>
      </template>
    </v-select>
    <secret-dialog-wrapper
      :visible-dialog="visibleSecretDialog"
      @dialog-closed="onSecretDialogClosed"
    ></secret-dialog-wrapper>
  </div>
</template>

<script>

import cloneDeep from 'lodash/cloneDeep'
import differenceWith from 'lodash/differenceWith'
import isEqual from 'lodash/isEqual'
import isEmpty from 'lodash/isEmpty'
import head from 'lodash/head'
import get from 'lodash/get'
import toUpper from 'lodash/toUpper'
import { mapGetters } from 'vuex'
import { getValidationErrors, isOwnSecret, selfTerminationDaysForSecret } from '@/utils'
import { required } from 'vuelidate/lib/validators'
import { requiresCostObjectIfEnabled } from '@/utils/validators'
import SecretDialogWrapper from '@/components/dialogs/SecretDialogWrapper.vue'

export default {
  components: {
    SecretDialogWrapper
  },
  props: {
    value: {
      type: Object
    },
    valid: {
      type: Boolean,
      default: true
    },
    disabled: {
      type: Boolean,
      default: false
    },
    cloudProfileName: {
      type: String
    },
    dnsProviderKind: {
      type: String
    }
  },
  data () {
    return {
      secretItemsBeforeAdd: undefined,
      visibleSecretDialog: undefined,
      validationErrors: {
        secret: {
          required: 'Secret is required',
          requiresCostObjectIfEnabled: () => {
            const projectName = get(this.secret, 'metadata.projectName')
            const isSecretInProject = this.projectName === projectName

            return isSecretInProject
              ? `${this.costObjectTitle} is required. Go to the ADMINISTRATION page to edit the project and set the ${this.costObjectTitle}.`
              : `${this.costObjectTitle} is required and has to be set on the Project ${toUpper(projectName)}`
          }
        }
      }
    }
  },
  validations: {
    secret: {
      required,
      requiresCostObjectIfEnabled
    }
  },
  computed: {
    ...mapGetters([
      'infrastructureSecretsByCloudProfileName',
      'costObjectSettings',
      'projectName',
      'cloudProfileByName',
      'dnsSecretsByProviderKind'
    ]),
    secret: {
      get () {
        return this.value
      },
      set (value) {
        this.$emit('input', value)
      }
    },
    secretValid: {
      get () {
        return this.valid
      },
      set (value) {
        if (this.valid !== value) {
          this.$emit('update:valid', value)
        }
      }
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
    costObjectSettingEnabled () { // required internally for requiresCostObjectIfEnabled
      return !isEmpty(this.costObjectSettings)
    },
    costObjectTitle () {
      return get(this.costObjectSettings, 'title')
    },
    selfTerminationDays () {
      return selfTerminationDaysForSecret(this.secret)
    }
  },
  methods: {
    get,
    isOwnSecret,
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    openSecretDialog () {
      this.visibleSecretDialog = this.infrastructureKind
      this.secretItemsBeforeAdd = cloneDeep(this.secretList)
    },
    onSecretDialogClosed () {
      this.visibleSecretDialog = undefined
      const newSecret = head(differenceWith(this.secretList, this.secretItemsBeforeAdd, isEqual))
      if (newSecret) {
        this.secret = newSecret
      }
    }
  },
  mounted () {
    this.$v.secret.$touch()
    this.secretValid = !this.$v.secret.$invalid
  },
  watch: {
    value () {
      this.$v.secret.$touch() // secret may not be valid (e.g. missing cost object). We want to show the error immediatley
    },
    '$v.secret.$invalid' (value) {
      this.secretValid = !value
    }
  }
}
</script>
