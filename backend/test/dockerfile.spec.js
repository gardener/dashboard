//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

'use strict'

const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const { promisify } = require('util')
const readFile = promisify(fs.readFile)
const got = require('got')
const { DockerfileParser } = require('dockerfile-ast')
const httpClient = got.extend({
  baseUrl: 'https://raw.githubusercontent.com/nodejs/docker-node/master',
  timeout: 3000
})
/* Nodejs release schedule (see https://nodejs.org/en/about/releases/) */
const activeNodeReleases = {
  '10': {
    initialRelease: new Date('2018-04-24T00:00:00Z'),
    activeLtsStart: new Date('2018-10-30T00:00:00Z'),
    endOfLife: new Date('2021-04-01T23:59:59Z')
  },
  '12': {
    initialRelease: new Date('2019-04-23T00:00:00Z'),
    activeLtsStart: new Date('2019-10-22T00:00:00Z'),
    endOfLife: new Date('2022-04-01T23:59:59Z')
  },
  '14': {
    initialRelease: new Date('2020-04-21T00:00:00Z'),
    activeLtsStart: new Date('2020-10-20T00:00:00Z'),
    endOfLife: new Date('2023-04-01T23:59:59Z')
  }
}

async function getNodeDockerfile (nodeVersion) {
  const { body } = await httpClient.get(`/${nodeVersion}/alpine/Dockerfile`)
  return DockerfileParser.parse(body)
}

async function getDashboardDockerfile () {
  const filename = path.join(__dirname, '..', '..', 'Dockerfile')
  const data = await readFile(filename, 'utf8')
  return DockerfileParser.parse(data)
}

describe('dockerfile', function () {
  this.timeout(5000)

  it('should have the same alpine base image as the corresponding node image', async function () {
    const dashboardDockerfile = await getDashboardDockerfile()

    expect(dashboardDockerfile.getFROMs()).to.have.length(4)
    const buildStages = _
      .chain(dashboardDockerfile.getFROMs())
      .map(from => [from.getBuildStage(), from])
      .fromPairs()
      .value()
    const imageTag = buildStages.base.getImageTag()
    const [, nodeRelease] = /^(\d+(?:\.\d+)?(?:\.\d+)?)-alpine$/.exec(imageTag) || []
    expect(_.keys(activeNodeReleases), `Node release ${nodeRelease} is not in the range of active LTS releases`).to.include(nodeRelease)
    const endOfLife = activeNodeReleases[nodeRelease].endOfLife
    expect(endOfLife, `Node release ${nodeRelease} reached end of life. Update node base image in Dockerfile.`).to.be.above(new Date())
    const nodeDockerfile = await getNodeDockerfile(nodeRelease)
    expect(nodeDockerfile.getFROMs()).to.have.length(1)
    const nodeBaseImage = _.first(nodeDockerfile.getFROMs()).getImage()
    const dashboardReleaseBaseImage = buildStages.release.getImage()
    expect(nodeBaseImage, 'Alpine base images of "dashboard-release" image and "node" image do not match!').to.be.equal(dashboardReleaseBaseImage)
  })
})
