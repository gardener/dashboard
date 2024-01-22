/*
 * The following code has been copied from https://gitlab.com/Larry1123/yarn-contrib/-/tree/master/packages/plugin-production-install
 */
const factory = require => {
  /*
   * Copyright 2020 Larry1123
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *     http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  const {
    BaseCommand,
  } = require('@yarnpkg/cli')
  const {
    Cache,
    Configuration,
    Project,
    ReportError,
    StreamReport,
    MessageName,
    LockfileResolver,
    WorkspaceResolver,
    LinkType,
    formatUtils,
    miscUtils,
    structUtils,
    tgzUtils,
  } = require('@yarnpkg/core')
  const {
    WorkspaceRequiredError,
  } = require('@yarnpkg/cli')
  const {
    npath,
    ppath,
    xfs,
  } = require('@yarnpkg/fslib')
  const {
    patchUtils,
  } = require('@yarnpkg/plugin-patch')
  const {
    packUtils,
  } = require('@yarnpkg/plugin-pack')
  const {
    Command,
    Option,
  } = require('clipanion')

  const ManifestFile = 'package.json'

  async function getDependents (project, searchPackage) {
    const collected = []
    for (const dependencyPackage of project.storedPackages.values()) {
      for (const dependencyDescriptor of dependencyPackage.dependencies.values()) {
        const resolutionLocatorHash = project.storedResolutions.get(
          dependencyDescriptor.descriptorHash,
        )
        if (resolutionLocatorHash === searchPackage.locatorHash) {
          collected.push(dependencyPackage)
          break
        }
      }
    }
    return collected
  }

  async function copyFile (src, dist, file) {
    await xfs.mkdirpPromise(ppath.dirname(ppath.resolve(dist, file)))
    return xfs.copyFilePromise(
      ppath.resolve(src, file),
      ppath.resolve(dist, file),
    )
  }

  async function copyFolder (src, dist, folder, exclude = []) {
    return copyFolderRecursivePromise(
      ppath.resolve(src, folder),
      ppath.resolve(dist, folder),
      exclude,
    )
  }

  async function copyFolderRecursivePromise (source, target, exclude = []) {
    if ((await xfs.lstatPromise(source)).isDirectory()) {
      if (!(await xfs.existsPromise(target))) {
        await xfs.mkdirpPromise(target)
      }
      const files = await xfs.readdirPromise(source)
      for (const file of files) {
        const curSource = ppath.resolve(source, file)
        const curTarget = ppath.resolve(target, file)
        const isExcluded = () => {
          for (const portablePath of exclude) {
            if (curSource.endsWith(portablePath)) return true
          }
          return false
        }
        if (!isExcluded()) {
          if ((await xfs.lstatPromise(curSource)).isDirectory()) {
            await copyFolderRecursivePromise(curSource, curTarget, exclude)
          } else {
            await xfs.copyFilePromise(curSource, curTarget)
          }
        }
      }
    } else {
      throw new Error('src not a folder')
    }
  }

  class ProductionInstallFetcher {
    constructor ({ fetcher, project, cache }) {
      this.fetcher = fetcher
      this.project = project
      this.cache = cache
    }

    supports (locator, opts) {
      return this.fetcher.supports(locator, opts)
    }

    getLocalPath (locator, opts) {
      if (locator.reference.startsWith(WorkspaceResolver.protocol) &&
        locator.reference !== `${WorkspaceResolver.protocol}.`) {
        return null
      } else {
        return this.fetcher.getLocalPath(locator, opts)
      }
    }

    async fetch (locator, opts) {
      const expectedChecksum = opts.checksums.get(locator.locatorHash) || null
      if (locator.reference.startsWith(WorkspaceResolver.protocol) &&
        locator.reference !== `${WorkspaceResolver.protocol}.`) {
        const cache = await this.makeTemporaryCache(opts.cache)
        // eslint-disable-next-line no-unused-vars
        const [packageFs, releaseFs, checksum] = await cache.fetchPackageFromCache(locator, expectedChecksum, {
          onHit: () => opts.report.reportCacheHit(locator),
          onMiss: () => opts.report.reportCacheMiss(locator, `${structUtils.prettyLocator(opts.project.configuration, locator)} can't be found in the cache and will be packed from disk.`),
          loader: async () => this.packWorkspace(locator, opts),
          skipIntegrityCheck: opts.skipIntegrityCheck,
        })
        cache.markedFiles.forEach(cachePath => opts.cache.markedFiles.add(cachePath))
        return {
          packageFs,
          releaseFs,
          prefixPath: structUtils.getIdentVendorPath(locator),
          checksum: expectedChecksum, // ?? checksum,
        }
      }
      const cachePath = this.cache.getLocatorPath(locator, expectedChecksum)
      if (
        cachePath &&
        cachePath.endsWith('.zip') &&
        (await xfs.existsPromise(cachePath))
      ) {
        const outCachePath = opts.cache.getLocatorPath(locator, expectedChecksum)
        if (outCachePath && !(await xfs.existsPromise(outCachePath))) {
          try {
            await xfs.linkPromise(cachePath, outCachePath)
          } catch (error) {
            if (!(await xfs.existsPromise(outCachePath))) {
              opts.report.reportError(
                MessageName.FETCH_FAILED,
                `Failed to link the cache entry for ${structUtils.prettyLocator(
                  opts.cache.configuration,
                  locator,
                )}`,
              )
            }
          }
        }
      }

      return this.fetcher.fetch(locator, opts)
    }

    async packWorkspace (locator, { report }) {
      const { configuration } = this.project
      const workspace = this.project.getWorkspaceByLocator(locator)
      return xfs.mktempPromise(async logDir => {
        const workspacePretty = structUtils.slugifyLocator(locator)
        const logFile = ppath.join(logDir, `${workspacePretty}-pack.log`)
        const header = `# This file contains the result of Yarn calling packing "${workspacePretty}" ("${workspace.cwd}")\n`
        const { stdout, stderr } = configuration.getSubprocessStreams(logFile, {
          report,
          prefix: structUtils.prettyLocator(configuration, workspace.anchoredLocator),
          header,
        })
        const packReport = await StreamReport.start({
          configuration,
          stdout,
        }, async () => {
          /** noop **/
        })
        try {
          let buffer
          await packUtils.prepareForPack(workspace, { report: packReport }, async () => {
            packReport.reportJson({ base: workspace.cwd })
            const files = await packUtils.genPackList(workspace)
            for (const file of files) {
              packReport.reportInfo(null, file)
              packReport.reportJson({ location: file })
            }
            const pack = await packUtils.genPackStream(workspace, files)
            buffer = await miscUtils.bufferStream(pack)
          })
          return await tgzUtils.convertToZip(buffer, {
            stripComponents: 1,
            prefixPath: structUtils.getIdentVendorPath(locator),
          })
        } catch (error) {
          xfs.detachTemp(logDir)
          if (error instanceof Error) {
            stderr.write(error.stack)
          }
          throw new ReportError(MessageName.LIFECYCLE_SCRIPT, `Packing ${workspacePretty} failed, logs can be found here: ${formatUtils.pretty(configuration, logFile, formatUtils.Type.PATH)}) run ${formatUtils.pretty(configuration, `yarn ${ppath.relative(this.project.cwd, workspace.cwd)} pack`, formatUtils.Type.CODE)} to investigate`)
        } finally {
          await packReport.finalize()
          stdout.end()
          stderr.end()
        }
      })
    }

    async makeTemporaryCache (cache) {
      const compressionLevel = cache.configuration.get('compressionLevel')
      const { configuration: { startingCwd, plugins }, check, immutable, cwd } = cache
      const configuration = Configuration.create(startingCwd, plugins)
      configuration.useWithSource(startingCwd, { enableMirror: false, compressionLevel }, startingCwd, { overwrite: true })
      return new Cache(cwd, {
        configuration,
        check,
        immutable,
      })
    }
  }

  class ProductionInstallResolver {
    constructor ({ resolver, project, stripTypes = true }) {
      this.resolver = resolver
      this.project = project
      this.stripTypes = stripTypes
    }

    supportsDescriptor (descriptor, opts) {
      return this.resolver.supportsDescriptor(descriptor, opts)
    }

    supportsLocator (locator, opts) {
      return this.resolver.supportsLocator(locator, opts)
    }

    shouldPersistResolution (locator, opts) {
      if (locator.reference.startsWith(WorkspaceResolver.protocol)) {
        return false
      } else {
        return this.resolver.shouldPersistResolution(locator, opts)
      }
    }

    bindDescriptor (descriptor, fromLocator, opts) {
      return this.resolver.bindDescriptor(descriptor, fromLocator, opts)
    }

    getResolutionDependencies (descriptor, opts) {
      return this.resolver.getResolutionDependencies(descriptor, opts)
    }

    async getCandidates (descriptor, dependencies, opts) {
      if (descriptor.range.startsWith(WorkspaceResolver.protocol) &&
        descriptor.range !== `${WorkspaceResolver.protocol}.`) {
        const workplace = this.project.getWorkspaceByDescriptor(descriptor)
        return [workplace.anchoredLocator]
      } else {
        return this.resolver.getCandidates(descriptor, dependencies, opts)
      }
    }

    async resolve (locator, opts) {
      const resolve = async () => {
        if (locator.reference.startsWith(WorkspaceResolver.protocol) &&
          locator.reference !== `${WorkspaceResolver.protocol}.`) {
          const workspace = this.project.getWorkspaceByLocator(locator)
          return {
            ...locator,
            version: workspace.manifest.version || '0.0.0',
            languageName: 'unknown',
            linkType: LinkType.SOFT,
            dependencies: this.project.configuration.normalizeDependencyMap(new Map([...workspace.manifest.dependencies])),
            peerDependencies: new Map([...workspace.manifest.peerDependencies]),
            dependenciesMeta: workspace.manifest.dependenciesMeta,
            peerDependenciesMeta: workspace.manifest.peerDependenciesMeta,
            bin: workspace.manifest.bin,
          }
        }
        return this.resolver.resolve(locator, opts)
      }
      const resolvedPackage = await resolve()
      const dependencies = new Map()
      for (const [hash, descriptor] of resolvedPackage.dependencies.entries()) {
        if (this.stripTypes && descriptor.scope === 'types') {
          continue
        }
        dependencies.set(hash, descriptor)
      }
      return {
        ...resolvedPackage,
        dependencies,
      }
    }

    async getSatisfying (_descriptor, _references, _opts) {
      return null
    }
  }

  class ProdInstallCommand extends BaseCommand {
    static paths = [['prod-install']]

    outDirectory = Option.String({
      name: 'outDirectory',
    })

    json = Option.Boolean('--json', false, {
      description: 'Format the output as an NDJSON stream',
    })

    stripTypes = Option.Boolean('--strip-types', true, {
      description: 'Use --no-strip-types to not strip `@types/*` dependencies',
    })

    pack = Option.Boolean('--pack', false)
    silent = Option.Boolean('--silent', false, {
      hidden: true,
    })

    production = Option.Boolean('--production', true, {
      description: 'Use --no-production to not strip devDependencies',
    })

    static usage = Command.Usage({
      description: 'INSTALL!',
      details: 'prod only install',
      examples: [
        ['Install the project with only prod dependencies', '$0 prod-install'],
      ],
    })

    async execute () {
      const configuration = await Configuration.find(
        this.context.cwd,
        this.context.plugins,
      )
      const {
        project, workspace,
      } = await Project.find(
        configuration,
        this.context.cwd,
      )

      await project.restoreInstallState()

      if (!workspace) {
        throw new WorkspaceRequiredError(project.cwd, this.context.cwd)
      }
      const cache = await Cache.find(configuration, {
        immutable: true,
        check: false,
      })

      const rootDirectoryPath = project.topLevelWorkspace.cwd
      const outDirectoryPath = npath.isAbsolute(this.outDirectory)
        ? npath.toPortablePath(this.outDirectory)
        : ppath.join(workspace.cwd, npath.toPortablePath(this.outDirectory))

      const reportOptions = {
        configuration,
        json: this.json,
        stdout: this.context.stdout,
      }
      const report = await StreamReport.start(reportOptions, async report => {
        await report.startTimerPromise('Setting up production directory', async () => {
          await xfs.mkdirpPromise(outDirectoryPath)
          await copyFile(rootDirectoryPath, outDirectoryPath, 'yarn.lock')
          await copyFile(rootDirectoryPath, outDirectoryPath, '.yarnrc.yml')
          await copyFile(workspace.cwd, outDirectoryPath, ManifestFile)
          const yarnExcludes = []
          const checkConfigurationToExclude = config => {
            try {
              if (configuration.get(config)) {
                yarnExcludes.push(configuration.get(config))
              }
            } catch (err) { }
          }
          checkConfigurationToExclude('installStatePath')
          checkConfigurationToExclude('cacheFolder')
          checkConfigurationToExclude('deferredVersionFolder')

          await configuration.triggerHook(
            hooks => {
              return hooks.populateYarnPaths
            },
            project,
            path => {
              if (path) {
                yarnExcludes.push(path)
              }
            },
          )

          await copyFolder(
            rootDirectoryPath,
            outDirectoryPath,
            '.yarn',
            yarnExcludes,
          )
        })

        await report.startTimerPromise('Installing production version', async () => {
          const outConfiguration = await Configuration.find(outDirectoryPath, this.context.plugins)

          if (this.stripTypes && outConfiguration.packageExtensions) {
            for (const [ident, extensionsByIdent] of outConfiguration.packageExtensions.entries()) {
              const identExt = []
              for (const [range, extensionsByRange] of extensionsByIdent) {
                identExt.push([
                  range,
                  extensionsByRange.filter(extension => extension?.descriptor?.scope !== 'types'),
                ])
              }
              outConfiguration.packageExtensions.set(ident, identExt)
            }
          }

          const {
            project: outProject,
            workspace: outWorkspace,
          } = await Project.find(outConfiguration, outDirectoryPath)
          if (!outWorkspace) {
            throw new WorkspaceRequiredError(project.cwd, this.context.cwd)
          }

          if (this.production) {
            outWorkspace.manifest.devDependencies.clear()
          }

          const outCache = await Cache.find(outConfiguration, {
            immutable: false,
            check: false,
          })

          const realResolver = configuration.makeResolver()

          const resolver = new ProductionInstallResolver({
            project,
            resolver: new realResolver.constructor([
              new LockfileResolver(realResolver),
              realResolver,
            ]),
            stripTypes: this.stripTypes,
          })

          const fetcher = new ProductionInstallFetcher({
            cache,
            fetcher: configuration.makeFetcher(),
            project,
          })

          await this.modifyOriginalResolutions(outProject, resolver, {
            project: outProject,
            fetchOptions: {
              cache: outCache,
              project: outProject,
              fetcher,
              checksums: outProject.storedChecksums,
              report,
            },
            resolver,
            report,
          })

          await outProject.install({
            cache: outCache,
            report,
            immutable: false,
            fetcher,
            resolver,
          })

          await report.startTimerPromise('Cleaning up unused dependencies', async () => {
            const toRemove = []
            const patchSourcesToRemove = await this.getPatchSourcesToRemove(outProject, outCache)
            toRemove.push(...patchSourcesToRemove)
            for (const locatorPath of toRemove) {
              if (await xfs.existsPromise(locatorPath)) {
                report.reportInfo(MessageName.UNUSED_CACHE_ENTRY, `${ppath.basename(locatorPath)} appears to be unused - removing`)
                await xfs.removePromise(locatorPath)
              }
            }
          })
        })

        if (this.pack) {
          await report.startTimerPromise('Packing workspace ', async () => {
            await packUtils.prepareForPack(workspace, { report }, async () => {
              report.reportJson({ base: workspace.cwd })

              const files = await packUtils.genPackList(workspace)

              for (const file of files) {
                report.reportInfo(null, file)
                report.reportJson({ location: file })
                if (file.endsWith(ManifestFile)) {
                  const manifest = await packUtils.genPackageManifest(workspace)
                  await xfs.writeJsonPromise(
                    ppath.resolve(outDirectoryPath, file),
                    manifest,
                  )
                } else {
                  await copyFile(workspace.cwd, outDirectoryPath, file)
                }
              }
            })
          })
        }
      })

      return report.exitCode()
    }

    async getPatchSourcesToRemove (project, cache) {
      const patchedPackages = []
      for (const storedPackage of project.storedPackages) {
        if (storedPackage.reference?.startsWith('patch:')) {
          patchedPackages.push(storedPackage)
        }
      }
      const toRemove = []
      for (const patchedPackage of patchedPackages) {
        const { sourceLocator } = patchUtils.parseLocator(patchedPackage)
        const sourcePackage = project.storedPackages.get(sourceLocator.locatorHash)
        if (!sourcePackage) {
          // This should be an error but currently not going to throw
          break
        }
        const dependencies = await getDependents(project, sourcePackage)
        if (dependencies.filter(pkg => pkg.locatorHash !== patchedPackage.locatorHash).length > 0) {
          const checksum = project.storedChecksums.get(sourceLocator.locatorHash) ?? null
          const locatorPath = cache.getLocatorPath(sourceLocator, checksum)
          if (locatorPath) {
            toRemove.push(locatorPath)
          }
        }
      }
      return toRemove
    }

    async modifyOriginalResolutions (project, resolver, opts) {
      await opts.report.startTimerPromise('Modifying original install state', async () => {
        for (const [locatorHash, originalPackage] of project.originalPackages.entries()) {
          const resolvedPackage = await resolver.resolve(originalPackage, opts)
          project.originalPackages.set(locatorHash, resolvedPackage)
        }
      })
    }
  }

  return {
    commands: [
      ProdInstallCommand,
    ],
  }
}

module.exports = {
  name: 'plugin-prod-install',
  factory,
}
