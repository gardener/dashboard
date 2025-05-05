'use strict';

var crypto = require('crypto');
var fs = require('fs/promises');
var logger = require('@gardener-dashboard/logger');

//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//


function sha256 (data) {
  return crypto.createHash('sha256').update(data).digest('hex')
}

async function createHashes (paths) {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- path is not user input
  const createHashEntry = async path => [path, sha256(await fs.readFile(path))];
  const hashEntries = await Promise.all(paths.map(createHashEntry));
  return new Map(hashEntries)
}

function addAbortListener (signal, abort) {
  if (signal instanceof AbortSignal) {
    if (!signal.aborted) {
      signal.addEventListener('abort', abort);
    } else {
      abort();
    }
  }
}

function removeAbortListener (signal, abort) {
  if (signal instanceof AbortSignal) {
    signal.removeEventListener('abort', abort);
  }
}

// Note: The parameter 'paths' must not be user input to prevent security vulnerabilities
async function createWatch (paths, options = {}) {
  const {
    interval = 300_000,
    signal,
  } = options;

  let intervalId;
  let aborted = false;

  const abort = () => {
    if (aborted) {
      return
    }
    aborted = true;
    logger.globalLogger.info('[polling-watcher] watch aborted');
    clearInterval(intervalId);
    removeAbortListener(signal, abort);
  };

  const hashes = await createHashes(paths);
  logger.globalLogger.info('[polling-watcher] watch created for %d files', paths.length);

  return fn => {
    const tryReadFile = async path => {
      try {
        // eslint-disable-next-line security/detect-non-literal-fs-filename -- path is not user input
        const data = await fs.readFile(path);
        const newHash = sha256(data);
        const oldHash = hashes.get(path);
        if (newHash !== oldHash) {
          logger.globalLogger.info('[polling-watcher] detected file change `%s`', path);
          hashes.set(path, newHash);
          fn(path, data.toString('utf8'));
        }
      } catch (err) {
        logger.globalLogger.error('[polling-watcher] failed to read file `%s`: %s', path, err.message);
      }
    };

    if (intervalId) {
      throw new Error('Watcher already started')
    }

    intervalId = setInterval(() => {
      for (const path of paths) {
        tryReadFile(path);
      }
    }, interval);
    addAbortListener(signal, abort);
    logger.globalLogger.debug('[polling-watcher] watch started with interval %dms', interval);

    return abort
  }
}

module.exports = createWatch;
