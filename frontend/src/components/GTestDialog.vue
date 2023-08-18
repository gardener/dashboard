<template>
  <div class="text-center">
    <h2>
      <span class="text-orange">{{ message }}</span>
    </h2>
    <v-btn
      variant="text"
      color="primary"
      :disabled="revaled1 || revaled2"
      @click="dialog1.reveal"
    >
      Click to Show Modal Dialog
    </v-btn>
  </div>

  <!-- First Dialog -->
  <v-dialog
    :model-value="revaled1"
    width="auto"
  >
    <div v-if="revaled1">
      <v-card>
        <v-card-text>
          <p>Show Second Dialog?</p>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="dialog1.confirm">
            OK
          </v-btn>
          <v-btn @click="dialog1.cancel">
            Cancel
          </v-btn>
        </v-card-actions>
      </v-card>
    </div>
  </v-dialog>

  <!-- Second Dialog -->
  <v-dialog
    :model-value="revaled2"
    width="auto"
  >
    <v-card>
      <v-card-text>
        <p>Confirm or Reject</p>
      </v-card-text>
      <v-card-actions>
        <v-btn @click="dialog2.confirm(true)">
          Confirm
        </v-btn>
        <v-btn @click="dialog2.confirm(false)">
          Reject
        </v-btn>
        <v-btn @click="dialog2.cancel">
          Cancel
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { useConfirmDialog } from '@vueuse/core'

const message = ref('')
const revaled1 = ref(false)
const revaled2 = ref(false)

const dialog1 = useConfirmDialog(revaled1)
const dialog2 = useConfirmDialog(revaled2)

dialog1.onReveal(() => {
  message.value = 'Modal is shown!'
})

dialog1.onConfirm(() => {
  dialog2.reveal()
})

dialog1.onCancel(() => {
  message.value = 'Canceled!'
})

dialog2.onReveal(() => {
  message.value = 'Second modal is shown!'
})

dialog2.onConfirm((result) => {
  message.value = result
    ? 'Confirmed!'
    : 'Rejected!'
})

dialog2.onCancel(() => {
  dialog1.reveal()
  message.value = 'Canceled!'
})
</script>
