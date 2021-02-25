<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

 <template>
  <g-dialog
    ref="gDialog"
    confirm-button-text="Ok"
    cancel-button-text=""
    maxWidth="600"
    @dialog-closed="onDialogClosed()"
    >
    <template v-slot:caption>About</template>
    <template v-slot:message>
      <div class="d-flex flex-row align-center mt-3">
        <img src="/static/logo/logo.svg" class="logo mr-3">
        <div>
          <h2 class="mb-1">Gardener Dashboard</h2>
        </div>
      </div>
      <v-divider class="my-3"></v-divider>
      <div class="grey--text text--darken-1">
        <div class="font-weight-bold">Version Information</div>
        <div v-if="!!dashboardVersion">Dashboard<code class="ml-1 px-1">{{dashboardVersion}}</code></div>
        <div v-if="!!gardenerVersion">API<code class="ml-1 px-1">{{gardenerVersion}}</code></div>
        <v-divider v-if="extensionsList.length" class="my-3"></v-divider>
        <div v-if="extensionsList.length" class="font-weight-bold">Extensions ({{extensionsList.length}} deployed)</div>
        <div
        v-for="extension in extensionsList"
        :key="extension.id"
        class="extension-item">
          <span>{{extension.name}}</span>
          <span v-if="!!extension.version"><code class="ml-1 px-1">{{extension.version}}</code></span>
          <span v-if="!!extension.kind"> (Kind: {{extension.kind}})</span>
        </div>
      </div>
    </template>
  </g-dialog>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import GDialog from '@/components/dialogs/GDialog'
import { getInfo } from '@/utils/api'
import sortBy from 'lodash/sortBy'

export default {
  name: 'info-dialog',
  components: {
    GDialog
  },
  props: {
    value: {
      type: Boolean
    }
  },
  data () {
    return {
      gardenerVersion: undefined,
      dashboardVersion: undefined
    }
  },
  computed: {
    ...mapGetters([
      'isAdmin',
      'gardenerExtensionsList'
    ]),
    extensionsList () {
      return sortBy(this.gardenerExtensionsList, 'name')
    }
  },
  methods: {
    ...mapActions([
      'fetchGardenerExtensions',
      'setError'
    ]),
    async fetchVersions () {
      try {
        const {
          data: {
            gardenerVersion,
            version
          } = {}
        } = await getInfo()
        if (gardenerVersion) {
          this.gardenerVersion = gardenerVersion.gitVersion
        }
        if (version) {
          this.dashboardVersion = `${version}`
        }
      } catch (err) {
        this.setError({
          message: `Failed to fetch version information. ${err.message}`
        })
      }
    },
    async fetchExtensions () {
      if (this.isAdmin) {
        await this.fetchGardenerExtensions()
      }
    },
    onDialogClosed () {
      this.$emit('dialog-closed')
    }
  },
  watch: {
    value (value) {
      if (value) {
        this.$refs.gDialog.showDialog()
        this.fetchVersions()
        this.fetchExtensions()
      }
    }
  }
}

</script>

<style lang="scss" scoped>
  .logo {
    height: 50px;
  }
</style>
