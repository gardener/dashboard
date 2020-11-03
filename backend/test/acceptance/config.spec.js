//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

module.exports = function ({ agent }) {
  /* eslint no-unused-expressions: 0 */

  it('should return the frontend configuration', async function () {
    const res = await agent
      .get('/config.json')

    expect(res).to.have.status(200)
    expect(res).to.be.json
    expect(res.body).to.have.property('helpMenuItems').that.is.an('array')
    expect(res.body.helpMenuItems).to.have.length(3)
    expect(res.body.landingPageUrl).to.equal('https://gardener.cloud/')
  })
}
