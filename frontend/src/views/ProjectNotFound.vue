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
    code="404"
    text="Project not found"
    message="The project you are looking for doesn't exist or an other error occured!"
    buttonText="Get me out of here"
    @click="onClick"
  ></g-error>
</template>

<script>
import GError from '@/components/GError'

export default {
  components: {
    GError
  },
  methods: {
    async onClick () {
      try {
        await this.$router.push({
          name: 'Home'
        })
      } catch (err) { /* ignore error */ }
    }
  }
}
</script>
