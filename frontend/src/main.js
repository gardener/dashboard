//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
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
