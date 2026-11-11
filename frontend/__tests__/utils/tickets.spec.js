//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { formatAccessRestrictions } from '@/utils/tickets'

describe('ticket utils', () => {
  describe('formatAccessRestrictions', () => {
    it('returns an empty string when there are no access restrictions', () => {
      expect(formatAccessRestrictions()).toBe('')
      expect(formatAccessRestrictions([])).toBe('')
    })

    it('formats access restrictions and nested options as escaped Markdown', () => {
      const accessRestrictions = [
        {
          title: 'EU <access>',
          options: [
            { title: 'Support & maintenance\nEscalation' },
            { title: 'Audit' },
          ],
        },
        {
          title: 'Restricted network',
          options: [],
        },
      ]

      expect(formatAccessRestrictions(accessRestrictions)).toBe(`## Attention: This cluster has access restrictions
  - EU \\<access\\>
    - Support \\& maintenance Escalation
    - Audit
  - Restricted network
`)
    })
  })
})
