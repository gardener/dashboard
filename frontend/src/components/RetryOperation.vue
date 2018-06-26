<!--
Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
  <v-tooltip top v-if="canRetry">
    <v-btn small icon slot="activator" flat class="cyan--text text--darken-2 retryButton" @click="onRetryOperation">
      <v-icon>mdi-reload</v-icon>
    </v-btn>
    Retry Operation
  </v-tooltip>
</template>



<script>
  import get from 'lodash/get'
  import { isReconciliationDeactivated } from '@/utils'
  import { addAnnotation } from '@/utils/api'

  export default {
    props: {
      shootItem: {
        type: Object
      }
    },
    data () {
      return {
        retryingOperation: false
      }
    },
    computed: {
      name () {
        return get(this.shootItem, 'metadata.name')
      },
      namespace () {
        return get(this.shootItem, 'metadata.namespace')
      },
      metadata () {
        return get(this.shootItem, 'metadata', {})
      },
      status () {
        return get(this.shootItem, 'status', {})
      },
      canRetry () {
        const reconcileScheduled = get(this.metadata, 'generation') !== get(this.status, 'observedGeneration')

        return get(this.status, 'lastOperation.state') === 'Failed' &&
          !this.reconciliationDeactivated &&
          !this.retryingOperation &&
          !reconcileScheduled
      },
      reconciliationDeactivated () {
        const metadata = { annotations: this.metadata.annotations }
        return isReconciliationDeactivated(metadata)
      }
    },
    methods: {
      onRetryOperation () {
        this.retryingOperation = true

        const user = this.$store.state.user
        const namespace = this.namespace
        const name = this.name

        const retryAnnotation = {'shoot.garden.sapcloud.io/operation': 'retry'}
        return addAnnotation({namespace, name, user, data: retryAnnotation})
        .then(() => {
          this.retryingOperation = false
        })
        .catch(err => {
          console.log('failed to retry operation', err)

          this.retryingOperation = false
          this.$store.dispatch('setError', err)
        })
      }
    }
  }
</script>

<style lang="styl" scoped>
</style>