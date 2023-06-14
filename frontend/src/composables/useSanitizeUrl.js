//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { unref } from 'vue'
import { sanitizeUrl } from '@braintree/sanitize-url'

export const useSanitizeUrl = () => {
  return url => sanitizeUrl(unref(url))
}
