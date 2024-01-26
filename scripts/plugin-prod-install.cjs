//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
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

  const core = originalRequire('@yarnpkg/core')
  const originalGet = core.Configuration.prototype.get
  core.Configuration.prototype.get = function get (key) {
    return key === 'lockfileFilename'
      ? 'yarn.lock'
      : originalGet.call(this, key)
  }
  const MultiResolver = core.Configuration.prototype.makeResolver.call({ plugins: new Map() }).constructor
  const LockfileResolver = core.LockfileResolver

  const fslib = originalRequire('@yarnpkg/fslib')
  const { npath, ppath } = fslib

  fslib.toFilename = function toFilename(filename) {
    if (npath.parse(filename).dir !== '' || ppath.parse(filename).dir !== '')
      throw new Error(`Invalid filename: "${filename}"`);
    return filename;
  }

  const __yarnUtils = (require, exports) => {
    exports.dependenciesUtils = require('./dependenciesUtils')
  }

  registry.set('@yarnpkg/core/lib/MultiResolver', { MultiResolver })
  registry.set('@yarnpkg/core/lib/LockfileResolver', { LockfileResolver })
  registry.set('@yarnpkg/fslib', fslib)
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
 * This version has been adapted and modified to ensure compatibility with yarn 4. The original plugin
 * appears to be unmaintained and incompatible with this version of yarn. Modifications include:
 * 1. Use method `getPackageExtensions` instead of directly accessing the property `configuration.packageExtensions`
 *   (see https://github.com/yarnpkg/berry/commit/207413b4ea5c9684ebc8dad77bf0cae4b0ec727a).
 *
 * These changes are detailed in the commit:
 * https://github.com/gardener/dashboard/commit/e1d01dda04608e9d2547a24d2dd20b552bcf7559.
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
  const MultiResolver_1 = require("@yarnpkg/core/lib/MultiResolver");
  const LockfileResolver_1 = require("@yarnpkg/core/lib/LockfileResolver");
  const cli_1 = require("@yarnpkg/cli");
  const fslib_1 = require("@yarnpkg/fslib");
  const plugin_patch_1 = require("@yarnpkg/plugin-patch");
  const plugin_pack_1 = require("@yarnpkg/plugin-pack");
  const clipanion_1 = require("clipanion");
  const yarn_utils_1 = require("@larry1123/yarn-utils");
  const util_1 = require("../util");
  const ProductionInstallFetcher_1 = require("../ProductionInstallFetcher");
  const ProductionInstallResolver_1 = require("../ProductionInstallResolver");
  const ManifestFile = (0, fslib_1.toFilename)('package.json');
  class ProdInstall extends clipanion_1.Command {
    constructor() {
      super(...arguments);
      this.outDirectory = clipanion_1.Option.String({ name: 'outDirectory' });
      this.json = clipanion_1.Option.Boolean(`--json`, false, { description: 'Format the output as an NDJSON stream' });
      this.stripTypes = clipanion_1.Option.Boolean('--strip-types', true, { description: 'Use --no-strip-types to not strip `@types/*` dependencies' });
      this.pack = clipanion_1.Option.Boolean('--pack', false);
      this.silent = clipanion_1.Option.Boolean('--silent', false, { hidden: true });
      this.production = clipanion_1.Option.Boolean(`--production`, true, { description: 'Use --no-production to not strip devDependencies' });
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
          await (0, util_1.copyFile)(rootDirectoryPath, outDirectoryPath, configuration.get(`lockfileFilename`));
          await (0, util_1.copyFile)(rootDirectoryPath, outDirectoryPath, configuration.get(`rcFilename`));
          await (0, util_1.copyFile)(workspace.cwd, outDirectoryPath, ManifestFile);
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
            const packageExtensions = await outConfiguration.getPackageExtensions()
            for (const [ident, extensionsByIdent,] of packageExtensions.entries()) {
              const identExt = [];
              for (const [range, extensionsByRange] of extensionsByIdent) {
                identExt.push([
                  range,
                  extensionsByRange.filter((extension) => {
                    var _a;
                    // TODO solve without ts-ignore
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    return ((_a = extension === null || extension === void 0 ? void 0 : extension.descriptor) === null || _a === void 0 ? void 0 : _a.scope) !== 'types';
                  }),
                ]);
              }
              packageExtensions.set(ident, identExt);
            }
          }
          const { project: outProject, workspace: outWorkspace, } = await core_1.Project.find(outConfiguration, outDirectoryPath);
          if (!outWorkspace) {
            throw new cli_1.WorkspaceRequiredError(project.cwd, this.context.cwd);
          }
          if (this.production) {
            outWorkspace.manifest.devDependencies.clear();
          }
          const outCache = await core_1.Cache.find(outConfiguration, {
            immutable: false,
            check: false,
          });
          const multiFetcher = configuration.makeFetcher();
          const realResolver = configuration.makeResolver();
          const multiResolver = new MultiResolver_1.MultiResolver([
            new LockfileResolver_1.LockfileResolver(realResolver),
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
                if (file.endsWith(ManifestFile)) {
                  const manifest = await plugin_pack_1.packUtils.genPackageManifest(workspace);
                  await fslib_1.xfs.writeJsonPromise(fslib_1.ppath.resolve(outDirectoryPath, file), manifest);
                }
                else {
                  await (0, util_1.copyFile)(workspace.cwd, outDirectoryPath, file);
                }
              }
            });
          });
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
 * The function `__ProductionInstallFetcher` is a direct wrapper of the corresponding file from the `plugin-prod-install`
 * yarn plugin developed by Larry1123. This code remains unmodified from the original implementation.
 * The original file can be found at:
 * https://gitlab.com/Larry1123/yarn-contrib/-/blob/master/packages/plugin-production-install/lib/ProductionInstallFetcher.js.
 *
 * Note: This wrapper is created to integrate with yarn 4, as the original plugin is
 * not maintained and is incompatible with this version of yarn.
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
  class ProductionInstallFetcher {
    constructor({ fetcher, project, cache, }) {
      this.fetcher = fetcher;
      this.project = project;
      this.cache = cache;
    }
    supports(locator, opts) {
      return this.fetcher.supports(locator, opts);
    }
    getLocalPath(locator, opts) {
      if (locator.reference.startsWith(core_1.WorkspaceResolver.protocol) &&
        locator.reference !== `${core_1.WorkspaceResolver.protocol}.`) {
        return null;
      }
      else {
        return this.fetcher.getLocalPath(locator, opts);
      }
    }
    async fetch(locator, opts) {
      const expectedChecksum = opts.checksums.get(locator.locatorHash) || null;
      if (locator.reference.startsWith(core_1.WorkspaceResolver.protocol) &&
        locator.reference !== `${core_1.WorkspaceResolver.protocol}.`) {
        const cache = await this.makeTemporaryCache(opts.cache);
        const [packageFs, releaseFs, checksum] = await cache.fetchPackageFromCache(locator, expectedChecksum, {
          onHit: () => opts.report.reportCacheHit(locator),
          onMiss: () => opts.report.reportCacheMiss(locator, `${core_1.structUtils.prettyLocator(opts.project.configuration, locator)} can't be found in the cache and will be packed from disk.`),
          loader: async () => this.packWorkspace(locator, opts),
          skipIntegrityCheck: opts.skipIntegrityCheck,
        });
        cache.markedFiles.forEach((cachePath) => opts.cache.markedFiles.add(cachePath));
        return {
          packageFs,
          releaseFs,
          prefixPath: core_1.structUtils.getIdentVendorPath(locator),
          checksum: expectedChecksum !== null && expectedChecksum !== void 0 ? expectedChecksum : checksum,
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
      }
      return this.fetcher.fetch(locator, opts);
    }
    async packWorkspace(locator, { report, }) {
      const { configuration, } = this.project;
      const workspace = this.project.getWorkspaceByLocator(locator);
      return fslib_1.xfs.mktempPromise(async (logDir) => {
        const workspacePretty = core_1.structUtils.slugifyLocator(locator);
        const logFile = fslib_1.ppath.join(logDir, (0, fslib_1.toFilename)(`${workspacePretty}-pack.log`));
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
          return await core_1.tgzUtils.convertToZip(buffer, {
            stripComponents: 1,
            prefixPath: core_1.structUtils.getIdentVendorPath(locator),
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
      configuration.useWithSource(startingCwd, { enableMirror: false }, startingCwd, { overwrite: true });
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
 * This version has been adapted and modified to ensure compatibility with yarn 4. The original plugin
 * appears to be unmaintained and incompatible with this version of yarn. Modifications include:
 * 1. Normalize dependency map of resolved workspace packages.
 *
 * These changes are detailed in the commit:
 * https://github.com/gardener/dashboard/commit/e1d01dda04608e9d2547a24d2dd20b552bcf7559.
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
      return this.resolver.supportsDescriptor(descriptor, opts);
    }
    supportsLocator(locator, opts) {
      return this.resolver.supportsLocator(locator, opts);
    }
    shouldPersistResolution(locator, opts) {
      if (locator.reference.startsWith(core_1.WorkspaceResolver.protocol)) {
        return false;
      }
      else {
        return this.resolver.shouldPersistResolution(locator, opts);
      }
    }
    bindDescriptor(descriptor, fromLocator, opts) {
      return this.resolver.bindDescriptor(descriptor, fromLocator, opts);
    }
    getResolutionDependencies(descriptor, opts) {
      return this.resolver.getResolutionDependencies(descriptor, opts);
    }
    async getCandidates(descriptor, dependencies, opts) {
      if (descriptor.range.startsWith(core_1.WorkspaceResolver.protocol) &&
        descriptor.range !== `${core_1.WorkspaceResolver.protocol}.`) {
        const workplace = this.project.getWorkspaceByDescriptor(descriptor);
        return [workplace.anchoredLocator];
      }
      else {
        return this.resolver.getCandidates(descriptor, dependencies, opts);
      }
    }
    async resolve(locator, opts) {
      const resolve = async () => {
        if (locator.reference.startsWith(core_1.WorkspaceResolver.protocol) &&
          locator.reference !== `${core_1.WorkspaceResolver.protocol}.`) {
          const workspace = this.project.getWorkspaceByLocator(locator);
          return {
            ...locator,
            version: workspace.manifest.version || `0.0.0`,
            languageName: `unknown`,
            linkType: core_1.LinkType.SOFT,
            dependencies: this.project.configuration.normalizeDependencyMap(new Map([...workspace.manifest.dependencies])),
            peerDependencies: new Map([...workspace.manifest.peerDependencies]),
            dependenciesMeta: workspace.manifest.dependenciesMeta,
            peerDependenciesMeta: workspace.manifest.peerDependenciesMeta,
            bin: workspace.manifest.bin,
          };
        }
        return this.resolver.resolve(locator, opts);
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
    async getSatisfying(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _descriptor,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _references,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _opts) {
      return null;
    }
  }
  exports.ProductionInstallResolver = ProductionInstallResolver;
}

/**
 * The function `__util` is a direct wrapper of the corresponding file from the `plugin-prod-install`
 * yarn plugin developed by Larry1123. This code remains unmodified from the original implementation.
 * The original file can be found at:
 * https://gitlab.com/Larry1123/yarn-contrib/-/blob/master/packages/plugin-production-install/lib/util.js.
 *
 * Note: This wrapper is created to integrate with yarn 4, as the original plugin is
 * not maintained and is incompatible with this version of yarn.
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
  async function copyFolder(src, dist, folder, exclude = []) {
    return copyFolderRecursivePromise(fslib_1.ppath.resolve(src, folder), fslib_1.ppath.resolve(dist, folder), exclude);
  }
  exports.copyFolder = copyFolder;
  async function copyFolderRecursivePromise(source, target, exclude = []) {
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
            await copyFolderRecursivePromise(curSource, curTarget, exclude);
          }
          else {
            await fslib_1.xfs.copyFilePromise(curSource, curTarget);
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
 *
 * Note: This wrapper is created to integrate with yarn 4, as the original plugin is
 * not maintained and is incompatible with this version of yarn.
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
