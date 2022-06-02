//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const jose = require('../lib/security/jose')

describe('security', function () {
  describe('jose', function () {
    const secret = 'this-is-a-secret-only-used-for-tests'
    const value = 'hello world'
    const { encrypt, decrypt } = jose(Buffer.from(secret).toString('base64'))

    it('should encrypt a value', async function () {
      const encryptedValue = await encrypt(value)
      const decryptedValue = await decrypt(encryptedValue)
      expect(decryptedValue).toBe(value)
    })

    it('should decrypt a value', async function () {
      const encryptedValue = 'eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiUEJFUzItSFMyNTYrQTEyOEtXIiwicDJjIjozMTQ5LCJwMnMiOiIwenZfczdqbl9kcVBJOER2czQ3WWNRIn0.7Uh_sBteoCt2jlVBR87w00tuFuUqQfEhsXJ7jigqKZoEc5n2tw_h5A.adbP15XHdzAWCpzGCGYnXA.zVhhD1iRqJ-JnoIbyj-HeA.neL8L8Vtcgue-a8PYS4zCQ'
      const decryptedValue = await decrypt(encryptedValue)
      expect(decryptedValue).toBe(value)
    })
  })
})
