//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

// Components
import { configureCompat } from '@vue/compat'
import App from '@/App.vue'
import '@/sass/main.scss'

// TODO: remove @vue/compat and this config
configureCompat({
  MODE: 3,
  // vuetify sets aria-hidden="false" on some elements such the "clear"-icon in a v-text-field
  // with "clearable" enabled. This should not be an issue for accessability so ignore it for now to
  // not spam console. 'suppress-warning' will silence warning but mimic vue2 behavior.
  ATTR_FALSE_VALUE: 'suppress-warning'
})
import { createApp } from 'vue'

// Plugins
import { registerPlugins } from '@/plugins'

const app = createApp(App)

registerPlugins(app)

app.mount('#app')
