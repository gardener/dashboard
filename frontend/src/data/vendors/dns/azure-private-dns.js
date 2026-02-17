//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import azureDns from './azure-dns'

export default {
  name: 'azure-private-dns',
  displayName: 'Azure Private DNS',
  weight: 300,
  icon: 'azure-dns.svg',
  secret: azureDns.secret,
}
