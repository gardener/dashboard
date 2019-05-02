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

const assert = require('assert').strict
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

async function getNodeDockerfile(nodeVersion) {
    const { body } = await httpClient.get(`/${nodeVersion}/alpine/Dockerfile`)
    return DockerfileParser.parse(body)
}

async function getDashboardDockerfile() {
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
        const [, nodeVersion] = /^(1[0-9])\-alpine$/.exec(imageTag) || []
        expect(nodeVersion).to.not.be.undefined
        
        const nodeDockerfile = await getNodeDockerfile(nodeVersion)
        expect(nodeDockerfile.getFROMs()).to.have.length(1)
        const nodeBaseImage = _.first(nodeDockerfile.getFROMs()).getImage()
        const dashboardReleaseBaseImage = buildStages.release.getImage()
        expect(nodeBaseImage, 'Alpine base images of "dashboard-release" image and "node" image do not match!').to.be.equal(dashboardReleaseBaseImage)
    })
})