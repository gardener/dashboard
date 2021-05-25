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
      label="Secret Binding"
      :items="secretItems"
      item-value="metadata.name"
      return-object
      v-model="secret"
      :error-messages="getErrorMessages('secret')"
      @input="onInputSecret"
      @blur="$v.secret.$touch()"
      persistent-hint
      :hint="secretHint"
      >
      <template v-slot:item="{ item }">
        <template v-if="isAddNewSecret(item)">
          <v-icon>mdi-plus</v-icon>
          <span class="pl-2">{{get(item, 'title')}}</span>
        </template>
        <template v-else>
          <span>{{get(item, 'metadata.name')}}</span>
          <v-icon v-if="!isOwnSecret(item)">mdi-share</v-icon>
        </template>
      </template>
      <template v-slot:selection="{ item }">
        <span>
          {{get(item, 'metadata.name')}}
        </span>
        <v-icon v-if="!isOwnSecret(item)">mdi-share</v-icon>
      </template>
    </v-select>
    <secret-dialog-wrapper
      :visible-dialog="visibleSecretDialog"
      @dialog-closed="onSecretDialogClosed"
    ></secret-dialog-wrapper>
  </div>
</template>

<script>

import concat from 'lodash/concat'
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
import SecretDialogWrapper from '@/components/dialogs/SecretDialogWrapper'

export default {
  components: {
    SecretDialogWrapper
  },
  props: {
    cloudProfileName: {
      type: String
    },
    dnsProviderKind: {
      type: String
    },
    selectedSecret: {
      type: Object
    }
  },
  data () {
    return {
      valid: undefined,
      secretItemsBeforeAdd: undefined,
      secret: undefined,
      visibleSecretDialog: undefined
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
      'projectFromProjectList',
      'cloudProfileByName',
      'dnsSecretsByProviderKind'
    ]),
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
    secretItems () {
      if (!isEmpty(this.infrastructureKind)) {
        return concat(this.secretList, {
          value: 'ADD_NEW_SECRET',
          title: 'Add new Secret'
        })
      } else {
        return this.secretList
      }
    },
    secretHint () {
      if (this.selfTerminationDays) {
        return `The selected secret has an associated quota that will cause the cluster to self terminate after ${this.selfTerminationDays} days`
      } else {
        return undefined
      }
    },
    costObjectSettingEnabled () { // required internally for requiresCostObjectIfEnabled
      return !isEmpty(this.costObjectSettings)
    },
    costObjectTitle () {
      return get(this.costObjectSettings, 'title')
    },
    isOwnSecret () {
      return (secret) => {
        return isOwnSecret(secret)
      }
    },
    selfTerminationDays () {
      return selfTerminationDaysForSecret(this.secret)
    },
    validationErrors () {
      return {
        secret: {
          required: 'Secret is required',
          requiresCostObjectIfEnabled: () => {
            const projectName = get(this.secret, 'metadata.projectName')
            const project = this.projectFromProjectList
            const isSecretInProject = project.metadata.name === projectName

            return isSecretInProject ? `${this.costObjectTitle} is required. Go to the ADMINISTRATION page to edit the project and set the ${this.costObjectTitle}.` : `${this.costObjectTitle} is required and has to be set on the Project ${toUpper(projectName)}`
          }
        }
      }
    }
  },
  methods: {
    get (object, path, defaultValue) {
      return get(object, path, defaultValue)
    },
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    onInputSecret () {
      if (this.isAddNewSecret(this.secret)) {
        this.onAddSecret()
      } else {
        this.$v.secret.$touch()
        this.validateInput()
        this.$emit('update-secret', this.secret)
      }
    },
    isAddNewSecret (item) {
      return (item && item.value === 'ADD_NEW_SECRET') || item === 'ADD_NEW_SECRET'
    },
    onAddSecret () {
      this.secret = undefined
      this.$nextTick(() => {
        // need to set in next ui loop as it would not render correctly otherwise
        this.secret = head(this.secretList)
        this.onInputSecret()
      })
      this.secretItemsBeforeAdd = cloneDeep(this.secretItems)
      this.visibleSecretDialog = this.infrastructureKind
    },
    onSecretDialogClosed () {
      this.visibleSecretDialog = undefined
      const newSecret = head(differenceWith(this.secretItems, this.secretItemsBeforeAdd, isEqual))
      if (newSecret) {
        this.secret = newSecret
        this.onInputSecret()
      }
    },
    validateInput () {
      if (this.valid !== !this.$v.$invalid) {
        this.valid = !this.$v.$invalid
        this.$emit('valid', this.valid)
      }
    }
  },
  mounted () {
    this.secret = this.selectedSecret
    this.$v.$touch()
    this.validateInput()
  },
  watch: {
    selectedSecret: function (selectedSecret) {
      this.secret = selectedSecret
      this.$v.secret.$touch() // secret may not be valid (e.g. missing cost object). We want to show the error immediatley
      this.validateInput()
    }
  }
}
</script>
