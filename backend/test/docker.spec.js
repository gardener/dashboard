//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
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
const { extend, globalAgent } = jest.requireActual('@gardener-dashboard/request')
const client = extend({
  prefixUrl: 'https://raw.githubusercontent.com/nodejs/docker-node/master/'
})

/* Nodejs release schedule (see https://nodejs.org/en/about/releases/) */
const activeNodeReleases = {
  12: {
    endOfLife: new Date('2022-04-01T23:59:59Z')
  },
  14: {
    endOfLife: new Date('2023-04-01T23:59:59Z')
  },
  15: {
    endOfLife: new Date('2021-06-01T23:59:59Z')
  },
  16: {
    endOfLife: new Date('2024-04-30T23:59:59Z')
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
  const timeout = 15 * 1000

  afterAll(() => {
    globalAgent.destroy()
  })

  it('should have the same alpine base image as the corresponding node image', async function () {
    const dashboardDockerfile = await getDashboardDockerfile()

    expect(dashboardDockerfile.getFROMs()).toHaveLength(2)
    const buildStages = _
      .chain(dashboardDockerfile.getFROMs())
      .map(from => [from.getBuildStage(), from])
      .fromPairs()
      .value()
    const imageTag = buildStages.builder.getImageTag()
    const [, nodeRelease] = /^(\d+(?:\.\d+)?(?:\.\d+)?)-alpine/.exec(imageTag) || []
    expect(_.keys(activeNodeReleases)).toContain(nodeRelease)
    const endOfLife = activeNodeReleases[nodeRelease].endOfLife
    // Node release ${nodeRelease} reached end of life. Update node base image in Dockerfile.
    expect(endOfLife.getTime()).toBeGreaterThan(Date.now())
    const dashboardReleaseBaseImage = buildStages.release.getImage()
    const [, alpineVersion] = /alpine:(\d+\.\d+)/.exec(dashboardReleaseBaseImage)
    const nodeDockerfile = await getNodeDockerfile(nodeRelease, alpineVersion)
    expect(nodeDockerfile.getFROMs()).toHaveLength(1)
    const nodeBaseImage = _.first(nodeDockerfile.getFROMs()).getImage()
    // Alpine base images of "dashboard-release" image and "node" image do not match!
    expect(dashboardReleaseBaseImage.endsWith(nodeBaseImage)).toBe(true)
  }, timeout)
})
