//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const factory = originalRequire => {
  const registry = new Map([])

  function createModule(moduleFactory) {
    const exports = {}
    moduleFactory(require, exports)
    return exports
  }

  function require (id) {
    return registry.has(id)
      ? registry.get(id)
      : originalRequire(id)
  }

  const core = require('@yarnpkg/core')
  const MultiResolver = core.Configuration.prototype.makeResolver.call({ plugins: new Map() }).constructor

  const __yarnUtils = (require, exports) => {
    exports.dependenciesUtils = require('./dependenciesUtils')
  }

  registry.set('../MultiResolver', { MultiResolver })
  registry.set('./dependenciesUtils', createModule(__dependenciesUtils))
  registry.set('@larry1123/yarn-utils', createModule(__yarnUtils))
  registry.set('../util', createModule(__util))
  registry.set('../ProductionInstallFetcher', createModule(__ProductionInstallFetcher))
  registry.set('../ProductionInstallResolver', createModule(__ProductionInstallResolver))
  registry.set('./ProductionInstallCommand', createModule(__ProductionInstallCommand))

  const { ProdInstall } = require('./ProductionInstallCommand')

  return {
    commands: [
      ProdInstall,
    ],
  }
}

/**
 * This function `__ProductionInstallCommand` is based on a file from the `plugin-prod-install` yarn plugin
 * originally developed by Larry1123. The original file can be found at:
 * https://gitlab.com/Larry1123/yarn-contrib/-/blob/master/packages/plugin-production-install/lib/commands/productionInstall.js.
 */
const __ProductionInstallCommand = (require, exports) => {
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
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.ProdInstall = void 0;
  // imports
  const core_1 = require("@yarnpkg/core");
  const MultiResolver_1 = require("../MultiResolver");
  const cli_1 = require("@yarnpkg/cli");
  const fslib_1 = require("@yarnpkg/fslib");
  const plugin_patch_1 = require("@yarnpkg/plugin-patch");
  const plugin_pack_1 = require("@yarnpkg/plugin-pack");
  const plugin_pnp_1 = require("@yarnpkg/plugin-pnp");
  const clipanion_1 = require("clipanion");
  const yarn_utils_1 = require("@larry1123/yarn-utils");
  const util_1 = require("../util");
  const ProductionInstallFetcher_1 = require("../ProductionInstallFetcher");
  const ProductionInstallResolver_1 = require("../ProductionInstallResolver");
  class ProdInstall extends clipanion_1.Command {
    constructor() {
      super(...arguments);
      this.outDirectory = clipanion_1.Option.String({ name: 'outDirectory' });
      this.json = clipanion_1.Option.Boolean(`--json`, false, { description: 'Format the output as an NDJSON stream' });
      this.stripTypes = clipanion_1.Option.Boolean('--strip-types', true, { description: 'Use --no-strip-types to not strip `@types/*` dependencies' });
      this.pack = clipanion_1.Option.Boolean('--pack', false);
      this.silent = clipanion_1.Option.Boolean('--silent', false, { hidden: true });
      this.production = clipanion_1.Option.Boolean(`--production`, true, { description: 'Use --no-production to not strip devDependencies' });
      this.injectCjsPnp = clipanion_1.Option.String(`--injectCjsPnp`, '', { description: 'Expermental!: Use --injectCjsPnp to inject a require to the .pnp.cjs file, this requires pack to be enabled' });
    }
    async execute() {
      const configuration = await core_1.Configuration.find(this.context.cwd, this.context.plugins);
      const { project, workspace, } = await core_1.Project.find(configuration, this.context.cwd);
      await project.restoreInstallState();
      if (!workspace) {
        throw new cli_1.WorkspaceRequiredError(project.cwd, this.context.cwd);
      }
      const cache = await core_1.Cache.find(configuration, {
        immutable: true,
        check: false,
      });
      const rootDirectoryPath = project.topLevelWorkspace.cwd;
      const outDirectoryPath = fslib_1.npath.isAbsolute(this.outDirectory)
        ? fslib_1.npath.toPortablePath(this.outDirectory)
        : fslib_1.ppath.join(workspace.cwd, fslib_1.npath.toPortablePath(this.outDirectory));
      const report = await core_1.StreamReport.start({
        configuration,
        json: this.json,
        stdout: this.context.stdout,
      }, async (report) => {
        await report.startTimerPromise('Setting up production directory', async () => {
          await fslib_1.xfs.mkdirpPromise(outDirectoryPath);
          await (0, util_1.copyFile)(rootDirectoryPath, outDirectoryPath, fslib_1.Filename.lockfile);
          await (0, util_1.copyFile)(rootDirectoryPath, outDirectoryPath, configuration.get(`rcFilename`));
          await (0, util_1.copyFile)(workspace.cwd, outDirectoryPath, fslib_1.Filename.manifest);
          const yarnExcludes = [];
          const checkConfigurationToExclude = (config) => {
            try {
              if (configuration.get(config)) {
                yarnExcludes.push(configuration.get(config));
              }
            }
            catch (_) {
              // noop
            }
          };
          checkConfigurationToExclude('installStatePath');
          checkConfigurationToExclude('cacheFolder');
          checkConfigurationToExclude('deferredVersionFolder');
          await configuration.triggerHook((hooks) => {
            return hooks.populateYarnPaths;
          }, project, (path) => {
            if (path) {
              yarnExcludes.push(path);
            }
          });
          await (0, util_1.copyFolder)(rootDirectoryPath, outDirectoryPath, `.yarn`, yarnExcludes);
        });
        await report.startTimerPromise('Installing production version', async () => {
          const outConfiguration = await core_1.Configuration.find(outDirectoryPath, this.context.plugins);
          if (this.stripTypes) {
            const packageExtensions = await outConfiguration.getPackageExtensions();
            for (const extensionsByIdent of packageExtensions.values()) {
              for (const [, extensionsByRange] of extensionsByIdent) {
                for (const extension of extensionsByRange) {
                  if (extension.type === core_1.PackageExtensionType.Dependency && extension.descriptor.scope === 'types') {
                    extension.status = core_1.PackageExtensionStatus.Inactive;
                  }
                }
              }
            }
          }
          const { project: outProject, workspace: outWorkspace, } = await core_1.Project.find(outConfiguration, outDirectoryPath);
          if (!outWorkspace) {
            throw new cli_1.WorkspaceRequiredError(project.cwd, this.context.cwd);
          }
          if (this.production) {
            outWorkspace.manifest.devDependencies.clear();
          }
          // carry root package resolutions into out project
          for (const [original, resolution] of project.resolutionAliases) {
            outProject.resolutionAliases.set(original, resolution);
          }
          const outCache = await core_1.Cache.find(outConfiguration, {
            immutable: false,
            check: false,
          });
          const multiFetcher = outConfiguration.makeFetcher();
          const realResolver = configuration.makeResolver();
          const multiResolver = new MultiResolver_1.MultiResolver([
            new core_1.LockfileResolver(realResolver),
            realResolver,
          ]);
          const resolver = new ProductionInstallResolver_1.ProductionInstallResolver({
            project,
            resolver: multiResolver,
            stripTypes: this.stripTypes,
          });
          const fetcher = new ProductionInstallFetcher_1.ProductionInstallFetcher({
            cache,
            fetcher: multiFetcher,
            project,
          });
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
          });
          await outProject.install({
            cache: outCache,
            report,
            immutable: false,
            fetcher,
            resolver,
            checkResolutions: false,
            persistProject: false,
          });
          await report.startTimerPromise('Cleaning up unused dependencies', async () => {
            const toRemove = [];
            toRemove.push(...(await this.getPatchSourcesToRemove(outProject, outCache)));
            for (const locatorPath of toRemove) {
              if (await fslib_1.xfs.existsPromise(locatorPath)) {
                report.reportInfo(core_1.MessageName.UNUSED_CACHE_ENTRY, `${fslib_1.ppath.basename(locatorPath)} appears to be unused - removing`);
                await fslib_1.xfs.removePromise(locatorPath);
              }
            }
          });
        });
        if (this.pack) {
          await report.startTimerPromise('Packing workspace ', async () => {
            await plugin_pack_1.packUtils.prepareForPack(workspace, { report }, async () => {
              report.reportJson({ base: workspace.cwd });
              const files = await plugin_pack_1.packUtils.genPackList(workspace);
              for (const file of files) {
                report.reportInfo(null, file);
                report.reportJson({ location: file });
                if (file.endsWith(fslib_1.Filename.manifest)) {
                  const manifest = await plugin_pack_1.packUtils.genPackageManifest(workspace);
                  await fslib_1.xfs.writeJsonPromise(fslib_1.ppath.resolve(outDirectoryPath, file), manifest);
                }
                else {
                  await (0, util_1.copyFile)(workspace.cwd, outDirectoryPath, file);
                }
              }
            });
          });
          if (this.injectCjsPnp) {
            // Expermental
            await report.startTimerPromise('Injecting .pnp.cjs call into file ', async () => {
              const fileToInjectPath = fslib_1.npath.isAbsolute(this.injectCjsPnp)
                ? fslib_1.npath.toPortablePath(this.injectCjsPnp)
                : fslib_1.ppath.join(outDirectoryPath, fslib_1.npath.toPortablePath(this.injectCjsPnp));
              await fslib_1.xfs.statPromise(fileToInjectPath);
              const fileToInject = await fslib_1.xfs.readFilePromise(fileToInjectPath, 'utf8');
              const outConfiguration = await core_1.Configuration.find(outDirectoryPath, this.context.plugins);
              const { project: outProject, } = await core_1.Project.find(outConfiguration, outDirectoryPath);
              const { cjs: cjsPnpFile, } = (0, plugin_pnp_1.getPnpPath)(outProject);
              const relativeCjsPnpFilePath = fslib_1.ppath.relative(fslib_1.ppath.dirname(fileToInjectPath), cjsPnpFile);
              const injectedFile = `require('${relativeCjsPnpFilePath}').setup()\n${fileToInject}`;
              await fslib_1.xfs.writeFilePromise(fileToInjectPath, injectedFile);
            });
          }
        }
      });
      return report.exitCode();
    }
    async getPatchSourcesToRemove(project, cache) {
      var _a;
      const patchedPackages = [];
      project.storedPackages.forEach((storedPackage) => {
        if (storedPackage.reference.startsWith('patch:')) {
          patchedPackages.push(storedPackage);
        }
      });
      const toRemove = [];
      for (const patchedPackage of patchedPackages) {
        const { sourceLocator, } = plugin_patch_1.patchUtils.parseLocator(patchedPackage);
        const sourcePackage = project.storedPackages.get(sourceLocator.locatorHash);
        if (!sourcePackage) {
          // This should be an error but currently not going to throw
          break;
        }
        const dependencies = await yarn_utils_1.dependenciesUtils.getDependents(project, sourcePackage);
        if (dependencies.filter((pkg) => pkg.locatorHash !== patchedPackage.locatorHash).length > 0) {
          const locatorPath = cache.getLocatorPath(sourceLocator, (_a = project.storedChecksums.get(sourceLocator.locatorHash)) !== null && _a !== void 0 ? _a : null);
          if (locatorPath) {
            toRemove.push(locatorPath);
          }
        }
      }
      return toRemove;
    }
    async modifyOriginalResolutions(project, resolver, opts) {
      await opts.report.startTimerPromise('Modifying original install state', async () => {
        for (const [locatorHash, originalPackage,] of project.originalPackages.entries()) {
          const resolvedPackage = await resolver.resolve(originalPackage, opts);
          project.originalPackages.set(locatorHash, resolvedPackage);
        }
      });
    }
  }
  exports.ProdInstall = ProdInstall;
  ProdInstall.paths = [['prod-install']];
  ProdInstall.usage = clipanion_1.Command.Usage({
    description: 'INSTALL!',
    details: 'prod only install',
    examples: [
      [`Install the project with only prod dependencies`, `$0 prod-install`],
    ],
  });
}

/**
 * This function `__ProductionInstallFetcher` is based on a file from the `plugin-prod-install` yarn plugin
 * originally developed by Larry1123. The original file can be found at:
 * https://gitlab.com/Larry1123/yarn-contrib/-/blob/master/packages/plugin-production-install/lib/ProductionInstallFetcher.js.
 */
const __ProductionInstallFetcher = (require, exports) => {
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
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.ProductionInstallFetcher = void 0;
  // imports
  const core_1 = require("@yarnpkg/core");
  const fslib_1 = require("@yarnpkg/fslib");
  const plugin_pack_1 = require("@yarnpkg/plugin-pack");
  const libzip_1 = require("@yarnpkg/libzip");
  class ProductionInstallFetcher {
    constructor({ fetcher, project, cache, }) {
      this.fetcher = fetcher;
      this.project = project;
      this.cache = cache;
    }
    supports(locator, opts) {
      return this.fetcher.supports(locator, {
        project: opts.project,
        fetcher: this,
      });
    }
    getLocalPath(locator, opts) {
      if (locator.reference.startsWith(core_1.WorkspaceResolver.protocol) &&
        locator.reference !== `${core_1.WorkspaceResolver.protocol}.`) {
        return null;
      }
      else {
        return this.fetcher.getLocalPath(locator, {
          project: opts.project,
          fetcher: this,
          cache: opts.cache,
          cacheOptions: opts.cacheOptions,
          checksums: opts.checksums,
          report: opts.report,
        });
      }
    }
    async fetch(locator, opts) {
      const expectedChecksum = opts.checksums.get(locator.locatorHash) || null;
      if (locator.reference.startsWith(core_1.WorkspaceResolver.protocol) &&
        locator.reference !== `${core_1.WorkspaceResolver.protocol}.`) {
        const cache = await this.makeTemporaryCache(opts.cache);
        const [packageFs, releaseFs] = await cache.fetchPackageFromCache(locator, expectedChecksum, {
          onHit: () => opts.report.reportCacheHit(locator),
          onMiss: () => opts.report.reportCacheMiss(locator, `${core_1.structUtils.prettyLocator(opts.project.configuration, locator)} can't be found in the cache and will be packed from disk.`),
          loader: async () => this.packWorkspace(locator, {
            project: opts.project,
            fetcher: this,
            cache: opts.cache,
            cacheOptions: opts.cacheOptions,
            checksums: opts.checksums,
            report: opts.report,
          }),
        });
        cache.markedFiles.forEach((cachePath) => opts.cache.markedFiles.add(cachePath));
        return {
          packageFs,
          releaseFs,
          prefixPath: core_1.structUtils.getIdentVendorPath(locator),
          // TODO this seems wrong
          //  it should be the real checksum of the file but for some reason the file is being saved with the cacheKey instead
          checksum: cache.cacheKey,
        };
      }
      const cachePath = this.cache.getLocatorPath(locator, expectedChecksum);
      if (cachePath &&
        cachePath.endsWith('.zip') &&
        (await fslib_1.xfs.existsPromise(cachePath))) {
        const outCachePath = opts.cache.getLocatorPath(locator, expectedChecksum);
        if (outCachePath && !(await fslib_1.xfs.existsPromise(outCachePath))) {
          try {
            await fslib_1.xfs.linkPromise(cachePath, outCachePath);
          }
          catch (error) {
            if (!(await fslib_1.xfs.existsPromise(outCachePath))) {
              opts.report.reportError(core_1.MessageName.FETCH_FAILED, `Failed to link the cache entry for ${core_1.structUtils.prettyLocator(opts.cache.configuration, locator)}`);
            }
          }
        }
        const checksum = await core_1.hashUtils.checksumFile(outCachePath);
        let zipFs;
        const lazyFs = new fslib_1.LazyFS(() => core_1.miscUtils.prettifySyncErrors(() => {
          return zipFs = new libzip_1.ZipFS(outCachePath, {
            baseFs: fslib_1.xfs,
            readOnly: true,
          });
        }, message => {
          return `Failed to open the cache entry for ${core_1.structUtils.prettyLocator(opts.project.configuration, locator)}: ${message}`;
        }), fslib_1.ppath);
        // We use an AliasFS to speed up getRealPath calls (e.g. VirtualFetcher.ensureVirtualLink)
        // (there's no need to create the lazy baseFs instance to gather the already-known cachePath)
        const aliasFs = new fslib_1.AliasFS(outCachePath, {
          baseFs: lazyFs,
          pathUtils: fslib_1.ppath,
        });
        const releaseFs = () => {
          zipFs === null || zipFs === void 0 ? void 0 : zipFs.discardAndClose();
        };
        return {
          packageFs: aliasFs,
          releaseFs,
          prefixPath: core_1.structUtils.getIdentVendorPath(locator),
          checksum,
        };
      }
      return this.fetcher.fetch(locator, {
        project: opts.project,
        fetcher: this,
        cache: opts.cache,
        cacheOptions: opts.cacheOptions,
        checksums: opts.checksums,
        report: opts.report,
      });
    }
    async packWorkspace(locator, { report, }) {
      const { configuration, } = this.project;
      const workspace = this.project.getWorkspaceByLocator(locator);
      return fslib_1.xfs.mktempPromise(async (logDir) => {
        const workspacePretty = core_1.structUtils.slugifyLocator(locator);
        const logFile = fslib_1.ppath.join(logDir, `${workspacePretty}-pack.log`);
        const header = `# This file contains the result of Yarn calling packing "${workspacePretty}" ("${workspace.cwd}")\n`;
        const { stdout, stderr, } = configuration.getSubprocessStreams(logFile, {
          report,
          prefix: core_1.structUtils.prettyLocator(configuration, workspace.anchoredLocator),
          header,
        });
        const packReport = await core_1.StreamReport.start({
          configuration,
          stdout,
        }, async () => {
          /** noop **/
        });
        try {
          let buffer;
          await plugin_pack_1.packUtils.prepareForPack(workspace, { report: packReport }, async () => {
            packReport.reportJson({ base: workspace.cwd });
            const files = await plugin_pack_1.packUtils.genPackList(workspace);
            for (const file of files) {
              packReport.reportInfo(null, file);
              packReport.reportJson({ location: file });
            }
            const pack = await plugin_pack_1.packUtils.genPackStream(workspace, files);
            buffer = await core_1.miscUtils.bufferStream(pack);
          });
          return await core_1.miscUtils.releaseAfterUseAsync(async () => {
            return await core_1.tgzUtils.convertToZip(buffer, {
              configuration,
              stripComponents: 1,
              prefixPath: core_1.structUtils.getIdentVendorPath(locator),
            });
          });
        }
        catch (error) {
          fslib_1.xfs.detachTemp(logDir);
          if (error instanceof Error) {
            stderr.write(error.stack);
          }
          throw new core_1.ReportError(core_1.MessageName.LIFECYCLE_SCRIPT, `Packing ${workspacePretty} failed, logs can be found here: ${core_1.formatUtils.pretty(configuration, logFile, core_1.formatUtils.Type.PATH)}); run ${core_1.formatUtils.pretty(configuration, `yarn ${fslib_1.ppath.relative(this.project.cwd, workspace.cwd)} pack`, core_1.formatUtils.Type.CODE)} to investigate`);
        }
        finally {
          await packReport.finalize();
          stdout.end();
          stderr.end();
        }
      });
    }
    async makeTemporaryCache(cache) {
      const { configuration: { startingCwd, plugins, }, check, immutable, cwd, } = cache;
      const configuration = core_1.Configuration.create(startingCwd, plugins);
      configuration.useWithSource('<plugin>', { enableMirror: false }, startingCwd, { overwrite: true });
      return new core_1.Cache(cwd, {
        configuration,
        check,
        immutable,
      });
    }
  }
  exports.ProductionInstallFetcher = ProductionInstallFetcher;
}

/**
 * This function `__ProductionInstallResolver` is based on a file from the `plugin-prod-install` yarn plugin
 * originally developed by Larry1123. The original file can be found at:
 * https://gitlab.com/Larry1123/yarn-contrib/-/blob/master/packages/plugin-production-install/lib/ProductionInstallResolver.js.
 */
const __ProductionInstallResolver = (require, exports) => {
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
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.ProductionInstallResolver = void 0;
  // imports
  const core_1 = require("@yarnpkg/core");
  class ProductionInstallResolver {
    constructor({ resolver, project, stripTypes = true, }) {
      this.resolver = resolver;
      this.project = project;
      this.stripTypes = stripTypes;
    }
    supportsDescriptor(descriptor, opts) {
      descriptor = opts.project.configuration.normalizeDependency(descriptor);
      return this.resolver.supportsDescriptor(descriptor, {
        project: opts.project,
        resolver: this,
      });
    }
    supportsLocator(locator, opts) {
      locator = opts.project.configuration.normalizeLocator(locator);
      return this.resolver.supportsLocator(locator, {
        project: opts.project,
        resolver: this,
      });
    }
    shouldPersistResolution(locator, opts) {
      locator = opts.project.configuration.normalizeLocator(locator);
      if (locator.reference.startsWith(core_1.WorkspaceResolver.protocol)) {
        return false;
      }
      else {
        return this.resolver.shouldPersistResolution(locator, {
          project: opts.project,
          resolver: this,
        });
      }
    }
    bindDescriptor(descriptor, fromLocator, opts) {
      descriptor = opts.project.configuration.normalizeDependency(descriptor);
      fromLocator = opts.project.configuration.normalizeLocator(fromLocator);
      return this.resolver.bindDescriptor(descriptor, fromLocator, {
        project: opts.project,
        resolver: this,
      });
    }
    getResolutionDependencies(descriptor, opts) {
      descriptor = opts.project.configuration.normalizeDependency(descriptor);
      return this.resolver.getResolutionDependencies(descriptor, {
        project: opts.project,
        resolver: this,
      });
    }
    async getCandidates(descriptor, dependencies, opts) {
      descriptor = opts.project.configuration.normalizeDependency(descriptor);
      if (descriptor.range.startsWith(core_1.WorkspaceResolver.protocol) &&
        descriptor.range !== `${core_1.WorkspaceResolver.protocol}.`) {
        const workplace = this.project.getWorkspaceByDescriptor(descriptor);
        return [workplace.anchoredLocator];
      }
      else {
        return this.resolver.getCandidates(descriptor, dependencies, {
          project: opts.project,
          resolver: this,
          fetchOptions: opts.fetchOptions,
          report: opts.report,
        });
      }
    }
    async resolve(locator, opts) {
      locator = opts.project.configuration.normalizeLocator(locator);
      const resolve = async () => {
        if (locator.reference.startsWith(core_1.WorkspaceResolver.protocol) &&
          locator.reference !== `${core_1.WorkspaceResolver.protocol}.`) {
          const workspace = this.project.getWorkspaceByLocator(locator);
          return {
            ...locator,
            version: workspace.manifest.version || `0.0.0`,
            languageName: `unknown`,
            linkType: core_1.LinkType.HARD,
            dependencies: new Map([...workspace.manifest.dependencies]),
            peerDependencies: new Map([...workspace.manifest.peerDependencies]),
            dependenciesMeta: workspace.manifest.dependenciesMeta,
            peerDependenciesMeta: workspace.manifest.peerDependenciesMeta,
            bin: workspace.manifest.bin,
          };
        }
        return this.resolver.resolve(locator, {
          project: opts.project,
          resolver: this,
          fetchOptions: opts.fetchOptions,
          report: opts.report,
        });
      };
      const resolvedPackage = await resolve();
      const dependencies = new Map();
      for (const [hash, descriptor] of resolvedPackage.dependencies.entries()) {
        if (this.stripTypes && descriptor.scope === 'types') {
          continue;
        }
        dependencies.set(hash, descriptor);
      }
      return {
        ...resolvedPackage,
        dependencies,
      };
    }
    async getSatisfying(descriptor, dependencies, locators, opts) {
      descriptor = opts.project.configuration.normalizeDependency(descriptor);
      locators = locators.map(locator => opts.project.configuration.normalizeLocator(locator));
      const packageExtensions = await opts.project.configuration.getPackageExtensions();
      Object.keys(dependencies).forEach(key => dependencies[key] = opts.project.configuration.normalizePackage(dependencies[key], { packageExtensions }));
      return this.resolver.getSatisfying(descriptor, dependencies, locators, {
        project: opts.project,
        resolver: this,
        fetchOptions: opts.fetchOptions,
        report: opts.report,
      });
    }
  }
  exports.ProductionInstallResolver = ProductionInstallResolver;
}

/**
 * The function `__util` is a direct wrapper of the corresponding file from the `plugin-prod-install`
 * yarn plugin developed by Larry1123. This code remains unmodified from the original implementation.
 * The original file can be found at:
 * https://gitlab.com/Larry1123/yarn-contrib/-/blob/master/packages/plugin-production-install/lib/util.js.
 */
const __util = (require, exports) => {
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
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.copyFolderRecursivePromise = exports.copyFolder = exports.copyFile = void 0;
  // imports
  const fslib_1 = require("@yarnpkg/fslib");
  async function copyFile(src, dist, file) {
    await fslib_1.xfs.mkdirpPromise(fslib_1.ppath.dirname(fslib_1.ppath.resolve(dist, file)));
    return fslib_1.xfs.copyFilePromise(fslib_1.ppath.resolve(src, file), fslib_1.ppath.resolve(dist, file));
  }
  exports.copyFile = copyFile;
  async function copyFolder(src, dist, folder, exclude = [], linkInsteadOfCopy = false) {
    return copyFolderRecursivePromise(fslib_1.ppath.resolve(src, folder), fslib_1.ppath.resolve(dist, folder), exclude, linkInsteadOfCopy);
  }
  exports.copyFolder = copyFolder;
  async function copyFolderRecursivePromise(source, target, exclude = [], linkInsteadOfCopy = false) {
    if ((await fslib_1.xfs.lstatPromise(source)).isDirectory()) {
      if (!(await fslib_1.xfs.existsPromise(target))) {
        await fslib_1.xfs.mkdirpPromise(target);
      }
      const files = await fslib_1.xfs.readdirPromise(source);
      for (const file of files) {
        const curSource = fslib_1.ppath.resolve(source, file);
        const curTarget = fslib_1.ppath.resolve(target, file);
        const isExcluded = () => {
          for (const portablePath of exclude) {
            if (curSource.endsWith(portablePath))
              return true;
          }
          return false;
        };
        if (!isExcluded()) {
          if ((await fslib_1.xfs.lstatPromise(curSource)).isDirectory()) {
            await copyFolderRecursivePromise(curSource, curTarget, exclude, linkInsteadOfCopy);
          }
          else {
            if (linkInsteadOfCopy) {
              await fslib_1.xfs.linkPromise(curSource, curTarget);
            }
            else {
              await fslib_1.xfs.copyFilePromise(curSource, curTarget);
            }
          }
        }
      }
    }
    else {
      throw new Error('src not a folder');
    }
  }
  exports.copyFolderRecursivePromise = copyFolderRecursivePromise;
}

/**
 * The function `__dependenciesUtils` is a direct wrapper of the corresponding file from the `plugin-prod-install`
 * yarn plugin developed by Larry1123. This code remains unmodified from the original implementation.
 * The original file can be found at:
 * https://gitlab.com/Larry1123/yarn-contrib/-/blob/master/packages/yarn-utils/lib/dependenciesUtils.js.
 */
const __dependenciesUtils = (require, exports) => {
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
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.getDependents = void 0;
  /**
   * Get all packages that depend on a given package
   *
   * Be sure to have ran @{link Project#restoreInstallState} if needed
   *
   * @param project Project to search within
   * @param searchPackage Package to find as a dependency
   */
  async function getDependents(project, searchPackage) {
    const collected = [];
    for (const dependencyPackage of project.storedPackages.values()) {
      for (const dependencyDescriptor of dependencyPackage.dependencies.values()) {
        const resolutionLocatorHash = project.storedResolutions.get(dependencyDescriptor.descriptorHash);
        if (resolutionLocatorHash === searchPackage.locatorHash) {
          collected.push(dependencyPackage);
          break;
        }
      }
    }
    return collected;
  }
  exports.getDependents = getDependents;
}

module.exports = {
  name: 'plugin-prod-install',
  factory,
}
