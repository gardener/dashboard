<!--
Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
  <g-error
    :code="code"
    :text="text"
    :message="message"
    :buttonText="buttonText"
    @click="onClick"
  ></g-error>
</template>

<script>
import GError from '@/components/GError'
import get from 'lodash/get'

export default {
  components: {
    GError
  },
  props: {
    code: {
      type: [String, Number],
      default: '404'
    },
    text: {
      type: String,
      default: 'Cluster not found'
    },
    message: {
      type: String,
      default: 'The cluster you are looking for doesn\'t exist or an other error occured!'
    },
    buttonText: {
      type: String,
      default: 'Back to cluster list'
    }
  },
  computed: {
    fallbackRoute () {
      const defaultNamespace = this.$store.getters.defaultNamespace
      const namespace = get(this.$route, 'params.namespace', defaultNamespace)
      if (namespace) {
        return {
          name: 'ShootList',
          params: {
            namespace
          }
        }
      }
      return {
        name: 'Home'
      }
    }
  },
  methods: {
    async onClick () {
      try {
        this.$router.push(this.fallbackRoute)
      } catch (err) {
        /* Catch and ignore navigation aborted errors. Redirection happens in navigation guards (see https://router.vuejs.org/guide/essentials/navigation.html#router-push-location-oncomplete-onabort). */
      }
    }
  }
}
</script>
