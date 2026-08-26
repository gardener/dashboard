//
// SPDX-FileCopyrightText: Copyright Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

// Components
import { createApp } from 'vue'

import { registerPlugins } from '@/plugins'

import App from './App.vue'

// Composables

// Plugins

const app = createApp(App)

registerPlugins(app)

app.mount('#app')
