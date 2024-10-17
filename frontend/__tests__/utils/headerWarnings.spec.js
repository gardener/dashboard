//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { parseWarningHeader } from '@/utils/headerWarnings'

describe('utils', () => {
  describe('parseWarningHeader', () => {
    it('should parse header warnings', () => {
      const headerValue = '110 example.com "Response is stale", 112 - "Cache \\"down\\"" "Wed, 21 Oct 2015 07:28:00 GMT"'

      const warnings = parseWarningHeader(headerValue)
      expect(warnings).toStrictEqual([
        {
          code: '110',
          agent: 'example.com',
          text: 'Response is stale',
          date: null,
        },
        {
          code: '112',
          agent: '-',
          text: 'Cache "down"',
          date: 'Wed, 21 Oct 2015 07:28:00 GMT',
        },
      ])
    })
  })
})
