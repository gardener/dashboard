//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { RuleTester } from 'eslint'
import vueParser from 'vue-eslint-parser'

import requireTonalColorToken from '../../eslint-rules/require-tonal-color-token.cjs'

const ruleTester = new RuleTester({
  languageOptions: {
    parser: vueParser,
    ecmaVersion: 2025,
    sourceType: 'module',
  },
})

ruleTester.run('require-tonal-color-token', requireTonalColorToken, {
  valid: [
    {
      name: 'accepts a tonal alert with a tonal color token',
      filename: 'test.vue',
      code: '<template><v-alert variant="tonal" color="tonal-primary" /></template>',
    },
    {
      name: 'accepts a chip with its default tonal variant and a tonal color token',
      filename: 'test.vue',
      code: '<template><v-chip color="tonal-warning" /></template>',
    },
    {
      name: 'accepts a non-tonal alert with a semantic color',
      filename: 'test.vue',
      code: '<template><v-alert variant="outlined" color="error" /></template>',
    },
    {
      name: 'accepts a non-tonal chip with a semantic color',
      filename: 'test.vue',
      code: '<template><v-chip variant="outlined" color="success" /></template>',
    },
    {
      name: 'ignores values that are determined at runtime',
      filename: 'test.vue',
      code: '<template><v-alert :variant="variant" :color="color" /></template>',
    },
    {
      name: 'does not assume a chip with a dynamic variant is tonal',
      filename: 'test.vue',
      code: '<template><v-chip :variant="variant" color="primary" /></template>',
    },
    {
      name: 'ignores components other than alerts and chips',
      filename: 'test.vue',
      code: '<template><v-btn variant="tonal" color="primary" /></template>',
    },
  ],
  invalid: [
    {
      name: 'reports every semantic color on tonal alerts',
      filename: 'test.vue',
      code: `
        <template>
          <v-alert variant="tonal" color="primary" />
          <v-alert variant="tonal" color="warning" />
          <v-alert variant="tonal" color="error" />
          <v-alert variant="tonal" color="info" />
          <v-alert variant="tonal" color="success" />
        </template>
      `,
      errors: [
        {
          messageId: 'useTonalColor',
          data: {
            actual: 'primary',
            expected: 'tonal-primary',
            component: 'v-alert',
          },
        },
        {
          messageId: 'useTonalColor',
          data: {
            actual: 'warning',
            expected: 'tonal-warning',
            component: 'v-alert',
          },
        },
        {
          messageId: 'useTonalColor',
          data: {
            actual: 'error',
            expected: 'tonal-error',
            component: 'v-alert',
          },
        },
        {
          messageId: 'useTonalColor',
          data: {
            actual: 'info',
            expected: 'tonal-info',
            component: 'v-alert',
          },
        },
        {
          messageId: 'useTonalColor',
          data: {
            actual: 'success',
            expected: 'tonal-success',
            component: 'v-alert',
          },
        },
      ],
    },
    {
      name: 'reports a semantic color on a chip with its default tonal variant',
      filename: 'test.vue',
      code: '<template><v-chip color="warning" /></template>',
      errors: [
        {
          messageId: 'useTonalColor',
          data: {
            actual: 'warning',
            expected: 'tonal-warning',
            component: 'v-chip',
          },
        },
      ],
    },
    {
      name: 'reports semantic colors passed as bound string literals',
      filename: 'test.vue',
      code: '<template><v-chip :variant="\'tonal\'" v-bind:color="\'info\'" /></template>',
      errors: [
        {
          messageId: 'useTonalColor',
          data: {
            actual: 'info',
            expected: 'tonal-info',
            component: 'v-chip',
          },
        },
      ],
    },
  ],
})
