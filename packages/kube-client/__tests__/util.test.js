//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { setPatchType, PatchType } = require('../lib/util')

describe('kube-client', () => {
  describe('util', () => {
    describe('#setPatchType', () => {
      let options

      beforeEach(() => {
        options = {}
      })

      it('should set the MERGE patch type', async () => {
        expect(setPatchType(options, PatchType.MERGE)).toEqual({
          headers: {
            'content-type': 'application/merge-patch+json'
          }
        })
      })

      it('should throw an error for invalid patch types', () => {
        expect(() => setPatchType(options, 'invalid')).toThrow(TypeError)
      })
    })
  })
})
