//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const { promisify } = require('util')
const readFile = promisify(fs.readFile)
const { DockerfileParser } = require('dockerfile-ast')
const { extend } = require('@gardener-dashboard/request')
const client = extend({
  prefixUrl: 'https://raw.githubusercontent.com/nodejs/docker-node/master/',
  resolveBodyOnly: true,
  timeout: 3000
})
/* Nodejs release schedule (see https://nodejs.org/en/about/releases/) */
const activeNodeReleases = {
  10: {
    initialRelease: new Date('2018-04-24T00:00:00Z'),
    activeLtsStart: new Date('2018-10-30T00:00:00Z'),
    endOfLife: new Date('2021-04-01T23:59:59Z')
  },
  12: {
    initialRelease: new Date('2019-04-23T00:00:00Z'),
    activeLtsStart: new Date('2019-10-22T00:00:00Z'),
    endOfLife: new Date('2022-04-01T23:59:59Z')
  },
  14: {
    initialRelease: new Date('2020-04-21T00:00:00Z'),
    activeLtsStart: new Date('2020-10-20T00:00:00Z'),
    endOfLife: new Date('2023-04-01T23:59:59Z')
  }
}

async function getNodeDockerfile (nodeVersion, alpineVersion) {
  const body = await client.request(`${nodeVersion}/alpine${alpineVersion}/Dockerfile`)
  return DockerfileParser.parse(body)
}

async function getDashboardDockerfile () {
  const filename = path.join(__dirname, '..', '..', 'Dockerfile')
  const data = await readFile(filename, 'utf8')
  return DockerfileParser.parse(data)
}

describe('dockerfile', function () {
  this.timeout(15000)
  this.slow(5000)

  it('should have the same alpine base image as the corresponding node image', async function () {
    const dashboardDockerfile = await getDashboardDockerfile()

    expect(dashboardDockerfile.getFROMs()).to.have.length(2)
    const buildStages = _
      .chain(dashboardDockerfile.getFROMs())
      .map(from => [from.getBuildStage(), from])
      .fromPairs()
      .value()
    const imageTag = buildStages.builder.getImageTag()
    const [, nodeRelease] = /^(\d+(?:\.\d+)?(?:\.\d+)?)-alpine/.exec(imageTag) || []
    expect(_.keys(activeNodeReleases), `Node release ${nodeRelease} is not in the range of active LTS releases`).to.include(nodeRelease)
    const endOfLife = activeNodeReleases[nodeRelease].endOfLife
    expect(endOfLife, `Node release ${nodeRelease} reached end of life. Update node base image in Dockerfile.`).to.be.above(new Date())
    const dashboardReleaseBaseImage = buildStages.release.getImage()
    const [, alpineVersion] = /^alpine:(\d+\.\d+)/.exec(dashboardReleaseBaseImage)
    const nodeDockerfile = await getNodeDockerfile(nodeRelease, alpineVersion)
    expect(nodeDockerfile.getFROMs()).to.have.length(1)
    const nodeBaseImage = _.first(nodeDockerfile.getFROMs()).getImage()
    expect(nodeBaseImage, 'Alpine base images of "dashboard-release" image and "node" image do not match!').to.be.equal(dashboardReleaseBaseImage)
  })
})
