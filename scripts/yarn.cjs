#!/usr/bin/env node

const path = require('path')

const repoDir = path.dirname(__dirname)
const filename = process.argv[3].substring(repoDir.length)
const [, workspace] = /^\/(frontend|backend|charts|packages\/[^/]*)/.exec(filename) || []
if (workspace) {
  process.argv.push('--rootDir', path.join(repoDir, workspace))
}

require('../.yarn/releases/yarn-2.4.1.cjs')
