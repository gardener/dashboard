//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { toValue } from 'vue'
import { StorageSerializers } from '@vueuse/core'

const serializers = {
  ...StorageSerializers,
  flag: {
    read (value) {
      return value === 'enabled'
    },
    write (value) {
      return value ? 'enabled' : 'disabled'
    },
  },
  json: {
    read (value) {
      try {
        return value ? JSON.parse(value) : null
      } catch (err) {
        return null
      }
    },
    write (value) {
      return JSON.stringify(value)
    },
  },
  integer: {
    read (value) {
      return parseInt(value, 10)
    },
    write (value) {
      return String(value)
    },
  },
  enum (values, oldValue = null, initialValue = null) {
    return {
      read (value) {
        return values.includes(value)
          ? value
          : initialValue
      },
      write (value) {
        return values.includes(value)
          ? value
          : toValue(oldValue)
      },
    }
  },
}

export {
  serializers as default,
  serializers as StorageSerializers,
}
