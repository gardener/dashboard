<!--
SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-data-table-virtual
    :headers="headers"
    :items="shootCustomFields"
  >
    <template #[`item.showColumn`]="{ item }">
      {{ item.showColumn ? 'Yes' : 'No' }}
    </template>
    <template #[`item.columnSelectedByDefault`]="{ item }">
      {{ item.columnSelectedByDefault ? 'Yes' : 'No' }}
    </template>
    <template #[`item.sortable`]="{ item }">
      {{ item.sortable ? 'Yes' : 'No' }}
    </template>
    <template #[`item.searchable`]="{ item }">
      {{ item.searchable ? 'Yes' : 'No' }}
    </template>
    <template #[`item.showDetails`]="{ item }">
      {{ item.showDetails ? 'Yes' : 'No' }}
    </template>
    <template #[`item.icon`]="{ item }">
      <v-icon
        v-if="item.icon && isMdiIcon(item.icon)"
        v-tooltip:top="item.icon"
        color="primary"
      >
        {{ item.icon }}
      </v-icon>
      <template v-else>
        <span class="font-weight-light text-disabled">Not defined</span>
      </template>
    </template>
    <template #[`item.defaultValue`]="{ item }">
      <template v-if="item.defaultValue">
        {{ item.defaultValue }}
      </template>
      <span
        v-else
        class="font-weight-light text-disabled"
      >Not defined</span>
    </template>
    <template #[`item.tooltip`]="{ item }">
      <template v-if="item.tooltip">
        {{ item.tooltip }}
      </template>
      <span
        v-else
        class="font-weight-light text-disabled"
      >Not defined</span>
    </template>
    <template #[`item.weight`]="{ item }">
      <template v-if="item.weight !== undefined">
        {{ item.weight }}
      </template>
      <span
        v-else
        class="font-weight-light text-disabled"
      >Not defined</span>
    </template>
    <template #[`item.actions`]="{ item }">
      <div class="d-flex flex-nowrap align-center justify-center">
        <v-icon
          small
          class="mr-2"
          @click="openEditDialog(item)"
        >
          mdi-pencil
        </v-icon>
        <v-icon
          small
          @click="openConfirmDeleteDialog(item)"
        >
          mdi-delete
        </v-icon>
      </div>
    </template>
    <template #no-data>
      No custom fields configured
    </template>
  </v-data-table-virtual>
  <div class="pt-4">
    <v-btn
      color="primary"
      variant="text"
      @click="openAddDialog"
    >
      <v-icon class="text-primary">
        mdi-plus
      </v-icon>
      Add New Field
    </v-btn>
  </div>

  <!-- Add/Edit Dialog -->
  <v-dialog
    v-model="dialog"
    max-width="800px"
    persistent
  >
    <v-toolbar
      flat
      density="comfortable"
      class="bg-toolbar-background text-toolbar-title"
    >
      <v-toolbar-title
        class="dialog-title align-center justify-start"
        :text="dialogTitle"
      />
    </v-toolbar>
    <v-card
      tile
    >
      <div
        ref="refCardContent"
        class="card-content"
      >
        <v-toolbar
          title="General Settings"
          color="transparent"
        />
        <v-card-text>
          <v-row>
            <v-col
              cols="12"
              sm="6"
            >
              <v-text-field
                ref="refName"
                v-model.trim="v$.name.$model"
                variant="underlined"
                label="Name"
                required
                :error-messages="getErrorMessages(v$.name)"
                hint="Name of the custom field"
                persistent-hint
                @blur="v$.name.$touch()"
              />
            </v-col>
            <v-col
              cols="12"
              sm="6"
            >
              <g-icon-picker
                v-model="v$.icon.$model"
                :error-messages="getErrorMessages(v$.icon)"
                hint="MDI icon for field, e.g., 'mdi-network'"
              />
            </v-col>
          </v-row>
          <v-row>
            <v-col
              cols="12"
            >
              <v-text-field
                v-model.trim="v$.path.$model"
                variant="underlined"
                label="Path"
                required
                :error-messages="getErrorMessages(v$.path)"
                hint="Path in shoot resource, e.g., 'metadata.labels[&quot;shoot.gardener.cloud/status&quot;]'"
                persistent-hint
                @blur="v$.path.$touch()"
              />
            </v-col>
          </v-row>
          <v-row>
            <v-col
              cols="12"
              sm="6"
            >
              <v-text-field
                v-model="editedField.defaultValue"
                variant="underlined"
                label="Default Value"
                hint="Value to display if no value is found for the given path"
                persistent-hint
              />
            </v-col>
            <v-col
              cols="12"
              sm="6"
            >
              <v-text-field
                v-model="editedField.tooltip"
                variant="underlined"
                label="Tooltip"
                hint="Tooltip for the custom field"
                persistent-hint
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-divider />
        <v-toolbar
          title="Cluster List Settings"
          color="transparent"
        />
        <v-card-text>
          <v-row>
            <v-col cols="12">
              <v-checkbox
                v-model="v$.showColumn.$model"
                color="primary"
                label="Show Column"
                :error-messages="getErrorMessages(v$.showColumn)"
                hint="Field shall appear as column in the cluster list"
                persistent-hint
                density="compact"
              />
            </v-col>
          </v-row>
          <v-row>
            <v-col
              cols="12"
              sm="6"
            >
              <v-checkbox
                v-model="editedField.columnSelectedByDefault"
                color="primary"
                label="Column Displayed By Default"
                hint="Column shall be displayed by default on the cluster list"
                persistent-hint
                density="compact"
                :disabled="!editedField.showColumn"
              />
            </v-col>
            <v-col
              cols="12"
              sm="6"
            >
              <v-text-field
                v-model="editedField.weight"
                v-tooltip:top="{
                  text: 'The built-in columns start with a weight of 100, increasing by 100 (200, 300, etc.)',
                  model: weightTooltip
                }"
                variant="underlined"
                label="Weight"
                type="number"
                hint="Order of the column"
                persistent-hint
                :disabled="!editedField.showColumn"
              />
            </v-col>
          </v-row>
          <v-row>
            <v-col
              cols="12"
              sm="6"
            >
              <v-checkbox
                v-model="editedField.sortable"
                color="primary"
                label="Sortable"
                hint="Column is sortable on the cluster list"
                persistent-hint
                density="compact"
                :disabled="!editedField.showColumn"
              />
            </v-col>
            <v-col
              cols="12"
              sm="6"
            >
              <v-checkbox
                v-model="editedField.searchable"
                color="primary"
                label="Searchable"
                hint="Column is searchable on the cluster list"
                persistent-hint
                density="compact"
                :disabled="!editedField.showColumn"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-divider />
        <v-toolbar
          title="Cluster Details Settings"
          color="transparent"
        />
        <v-card-text>
          <v-checkbox
            v-model="v$.showDetails.$model"
            color="primary"
            label="Show Details"
            :error-messages="getErrorMessages(v$.showDetails)"
            hint="Indicates if field shall appear in a dedicated card on the cluster details page"
            persistent-hint
            density="compact"
          />
        </v-card-text>
      </div>
      <v-card-text
        v-if="errorMessage"
      >
        <g-message
          v-model:message="errorMessage"
          v-model:detailed-message="detailedErrorMessage"
          color="error"
          class="ma-0"
          tile
        />
      </v-card-text>
      <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-btn
          text
          @click="closeDialog"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          text
          :loading="loading"
          @click="addField"
        >
          {{ saveButtonTitle }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Delete Confirmation Dialog -->
  <v-dialog
    v-model="deleteDialog"
    persistent
    max-width="500px"
  >
    <v-card>
      <v-toolbar
        flat
        density="comfortable"
        class="bg-toolbar-background text-toolbar-title"
      >
        <v-toolbar-title class="dialog-title align-center justify-start">
          Confirm Delete
          <span class="font-family-monospace font-weight-bold">
            {{ deleteFieldItem.name }}
          </span>
        </v-toolbar-title>
      </v-toolbar>
      <v-card-text>Are you sure you want to delete this field?</v-card-text>
      <g-message
        v-model:message="errorMessage"
        v-model:detailed-message="detailedErrorMessage"
        color="error"
        class="ma-0"
        tile
      />
      <v-card-actions>
        <v-btn
          text
          @click="closeDeleteDialog"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          text
          :loading="loading"
          @click="deleteField"
        >
          Delete
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import {
  required,
  helpers,
} from '@vuelidate/validators'

import { useProjectStore } from '@/store/project'

import GMessage from '@/components/GMessage.vue'
import GIconPicker from '@/components/GIconPicker.vue'

import { useProjectContext } from '@/composables/useProjectContext'
import { useScrollBar } from '@/composables/useScrollBar'
import { useLogger } from '@/composables/useLogger'

import { messageFromErrors } from '@/utils/validators'
import {
  getErrorMessages,
  setDelayedInputFocus,
} from '@/utils'
import { errorDetailsFromError } from '@/utils/error'
import { isMdiIcon } from '@/utils/mdiIcons'

import cloneDeep from 'lodash/cloneDeep'

const headers = ref([
  { title: 'Name', key: 'name' },
  { title: 'Path', key: 'path' },
  { title: 'Icon', key: 'icon' },
  { title: 'Tooltip', key: 'tooltip' },
  { title: 'Default Value', key: 'defaultValue' },
  { title: 'Show Column', key: 'showColumn' },
  { title: 'Column Selected By Default', key: 'columnSelectedByDefault' },
  { title: 'Weight', key: 'weight' },
  { title: 'Sortable', key: 'sortable' },
  { title: 'Searchable', key: 'searchable' },
  { title: 'Show Details', key: 'showDetails' },
  { title: 'Actions', key: 'actions', sortable: false },
])

const dialog = ref(false)
const deleteDialog = ref(false)
const editedField = ref({
  name: '',
  path: '',
  icon: '',
  tooltip: '',
  defaultValue: '',
  showColumn: false,
  columnSelectedByDefault: false,
  weight: 0,
  sortable: false,
  searchable: false,
  showDetails: false,
})
const dialogTitle = ref('')
const saveButtonTitle = ref('')
const deleteFieldItem = ref(null)
const weightTooltip = ref(false)
const errorMessage = ref('')
const detailedErrorMessage = ref('')
const refName = ref(null)
const refCardContent = ref(null)
const loading = ref(false)

let uneditedCustomField // does not need to be reactive

useScrollBar(refCardContent)

const logger = useLogger()
const projectStore = useProjectStore()

const {
  shootCustomFields,
  addShootCustomField,
  deleteShootCustomField,
  replaceShootCustomField,
  isShootCustomFieldNameUnique,
  getShootCustomFieldsPatchDocument,
} = useProjectContext()

function openAddDialog () {
  dialogTitle.value = 'Add New Field'
  saveButtonTitle.value = 'Add'
  editedField.value = {
    name: '',
    path: '',
    icon: '',
    tooltip: '',
    defaultValue: '',
    showColumn: true,
    columnSelectedByDefault: true,
    weight: 0,
    sortable: true,
    searchable: true,
    showDetails: true,
  }
  dialog.value = true
  setDelayedInputFocus(refName)
}

function openEditDialog (item) {
  dialogTitle.value = 'Edit Field'
  saveButtonTitle.value = 'Update'
  editedField.value = cloneDeep(item)
  uneditedCustomField = item
  dialog.value = true
  setDelayedInputFocus(refName)
}

function closeDialog () {
  dialog.value = false
  v$.value.$reset()
  errorMessage.value = undefined
  detailedErrorMessage.value = undefined
  uneditedCustomField = undefined
}

async function addField () {
  if (v$.value.$invalid) {
    await v$.value.$validate()
    const message = messageFromErrors(v$.value.$errors)
    errorMessage.value = 'There are input errors that you need to resolve'
    detailedErrorMessage.value = message
    return
  }
  if (uneditedCustomField) {
    replaceShootCustomField(uneditedCustomField, editedField.value)
  } else {
    addShootCustomField(editedField.value)
  }

  return updateConfiguration(closeDialog)
}

function deleteField () {
  deleteShootCustomField(deleteFieldItem.value)
  return updateConfiguration(closeDeleteDialog)
}

async function updateConfiguration (onSuccess) {
  loading.value = true
  try {
    const patchDocument = getShootCustomFieldsPatchDocument()
    await projectStore.patchProject(patchDocument)
    onSuccess()
  } catch (err) {
    errorMessage.value = 'Could not save custom fields configuration'
    if (err.response) {
      const errorDetails = errorDetailsFromError(err)
      detailedErrorMessage.value = errorDetails.detailedMessage
    } else {
      detailedErrorMessage.value = err.message
    }
    logger.error(errorMessage, detailedErrorMessage, err)
  } finally {
    loading.value = false
  }
}

function openConfirmDeleteDialog (item) {
  deleteFieldItem.value = item
  deleteDialog.value = true
}

function closeDeleteDialog () {
  deleteDialog.value = false
  errorMessage.value = undefined
  detailedErrorMessage.value = undefined
}

const isUniqueName = helpers.withMessage(
  'This name already exists',
  value => {
    if (uneditedCustomField && value === uneditedCustomField.name) {
      return true
    }
    return isShootCustomFieldNameUnique(value)
  },
)

const isKnownIconOrEmpty = helpers.withMessage(
  'Icon must be a valid MDI icon or be empty',
  value => !value || isMdiIcon(value),
)

const eitherShowColumnOrDetails = helpers.withMessage(
  'Either "Show Column" or "Show Details" must be checked',
  (value, vm) => vm.showColumn || vm.showDetails,
)

const rules = {
  name: { required, isUniqueName },
  path: { required },
  icon: { isKnownIconOrEmpty },
  showColumn: { eitherShowColumnOrDetails },
  showDetails: { eitherShowColumnOrDetails },
}

const v$ = useVuelidate(rules, editedField, { $stopPropagation: true })

</script>

<style lang="scss" scoped>
.card-content {
  overflow: scroll;
  height: auto;
}
</style>
