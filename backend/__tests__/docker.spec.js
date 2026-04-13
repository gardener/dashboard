//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  describe,
  it,
  expect,
} from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  chain,
  keys,
} from 'lodash-es'
import { fileURLToPath } from 'url'
import { DockerfileParser } from 'dockerfile-ast'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/* Nodejs release schedule (see https://nodejs.org/en/about/releases/) */
const activeNodeReleases = {
  22: {
    endOfLife: new Date('2027-04-30T23:59:59Z'),
  },
  24: {
    endOfLife: new Date('2028-04-30T23:59:59Z'),
  },
}

async function getDashboardDockerfile () {
  const filename = path.join(__dirname, '..', '..', 'Dockerfile')
  const data = await fs.promises.readFile(filename, 'utf8')
  return DockerfileParser.parse(data)
}

describe('dockerfile', function () {
  it('should have the same alpine base image as the corresponding node image', async function () {
    const dashboardDockerfile = await getDashboardDockerfile()

    expect(dashboardDockerfile.getFROMs()).toHaveLength(4)
    const buildStages = chain(dashboardDockerfile.getFROMs())
      .map(from => [from.getBuildStage(), from])
      .fromPairs()
      .value()
    const imageTag = buildStages.builder.getImageTag()
    const [, nodeRelease] = /^(\d+)\./.exec(imageTag) || []
    expect(keys(activeNodeReleases)).toContain(nodeRelease)
    const endOfLife = activeNodeReleases[nodeRelease].endOfLife
    // Node release ${nodeRelease} reached end of life. Update node base image in Dockerfile.
    expect(endOfLife.getTime()).toBeGreaterThan(Date.now())
    expect(buildStages['node-scratch'].getImage()).toBe('scratch')
    expect(buildStages.dashboard.getImage()).toBe('node-scratch')
  })
})
