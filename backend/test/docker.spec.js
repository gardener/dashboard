//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { readFile } = require('fs/promises')
const path = require('path')
const _ = require('lodash')
const { DockerfileParser } = require('dockerfile-ast')

/* Nodejs release schedule (see https://nodejs.org/en/about/releases/) */
const activeNodeReleases = {
  16: {
    endOfLife: new Date('2023-09-11T23:59:59Z')
  },
  18: {
    endOfLife: new Date('2025-04-30T23:59:59Z')
  },
  19: {
    endOfLife: new Date('2023-06-01T23:59:59Z')
  },
  20: {
    endOfLife: new Date('2026-04-30T23:59:59Z')
  }
}

async function getDashboardDockerfile () {
  const filename = path.join(__dirname, '..', '..', 'Dockerfile')
  const data = await readFile(filename, 'utf8')
  return DockerfileParser.parse(data)
}

describe('dockerfile', function () {
  it('should have the same alpine base image as the corresponding node image', async function () {
    const dashboardDockerfile = await getDashboardDockerfile()

    expect(dashboardDockerfile.getFROMs()).toHaveLength(2)
    const buildStages = _
      .chain(dashboardDockerfile.getFROMs())
      .map(from => [from.getBuildStage(), from])
      .fromPairs()
      .value()
    const nodeRelease = buildStages.builder.getImageTag()
    expect(Object.keys(activeNodeReleases)).toContain(nodeRelease)
    const endOfLife = activeNodeReleases[nodeRelease].endOfLife
    // Node release ${nodeRelease} reached end of life. Update node base image in Dockerfile.
    expect(endOfLife.getTime()).toBeGreaterThan(Date.now())
    const dashboardReleaseBaseImage = buildStages.release.getImage()
    expect(dashboardReleaseBaseImage.endsWith(`nodejs:${nodeRelease}`)).toBe(true)
  })
})
