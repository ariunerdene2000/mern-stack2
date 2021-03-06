"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.loadESLint = loadESLint;
exports.loadESLintThreaded = loadESLintThreaded;
exports.default = getESLint;

var _os = _interopRequireDefault(require("os"));

var _jestWorker = _interopRequireDefault(require("jest-worker"));

var _options = require("./options");

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/** @type {{[key: string]: any}} */
const cache = {};
/** @typedef {import('eslint').ESLint} ESLint */

/** @typedef {import('eslint').ESLint.LintResult} LintResult */

/** @typedef {import('./options').Options} Options */

/** @typedef {() => Promise<void>} AsyncTask */

/** @typedef {(files: string|string[]) => Promise<LintResult[]>} LintTask */

/** @typedef {JestWorker & {lintFiles: LintTask}} Worker */

/** @typedef {{threads: number, ESLint: ESLint, eslint: ESLint, lintFiles: LintTask, cleanup: AsyncTask}} Linter */

/**
 * @param {Options} options
 * @returns {Linter}
 */

function loadESLint(options) {
  const {
    eslintPath
  } = options;

  const {
    ESLint
  } = require(eslintPath || 'eslint'); // Filter out loader options before passing the options to ESLint.


  const eslint = new ESLint((0, _options.getESLintOptions)(options));
  return {
    threads: 1,
    ESLint,
    eslint,
    lintFiles: async files => {
      const results = await eslint.lintFiles(files); // istanbul ignore else

      if (options.fix) {
        await ESLint.outputFixes(results);
      }

      return results;
    },
    // no-op for non-threaded
    cleanup: async () => {}
  };
}
/**
 * @param {number} poolSize
 * @param {Options} options
 * @returns {Linter}
 */


function loadESLintThreaded(poolSize, options) {
  const key = getCacheKey(options);
  const {
    eslintPath = 'eslint'
  } = options;

  const source = require.resolve('./worker');

  const workerOptions = {
    enableWorkerThreads: true,
    numWorkers: poolSize,
    setupArgs: [{
      eslintPath,
      eslintOptions: (0, _options.getESLintOptions)(options)
    }]
  };
  const local = loadESLint(options);
  /** @type {Worker?} */
  // prettier-ignore

  let worker =
  /** @type {Worker} */
  new _jestWorker.default(source, workerOptions);
  /** @type {Linter} */

  const context = { ...local,
    threads: poolSize,
    lintFiles: async (files) => worker && (await worker.lintFiles(files)) ||
    /* istanbul ignore next */
    [],
    cleanup: async () => {
      cache[key] = local;

      context.lintFiles = files => local.lintFiles(files);

      if (worker) {
        worker.end();
        worker = null;
      }
    }
  };
  return context;
}
/**
 * @param {Options} options
 * @returns {Linter}
 */


function getESLint({
  threads,
  ...options
}) {
  const max = typeof threads !== 'number' ? threads ? _os.default.cpus().length - 1 : 1 :
  /* istanbul ignore next */
  threads;
  const key = getCacheKey({
    threads,
    ...options
  });

  if (!cache[key]) {
    cache[key] = max > 1 ? loadESLintThreaded(max, options) : loadESLint(options);
  }

  return cache[key];
}
/**
 * @param {Options} options
 * @returns {string}
 */


function getCacheKey(options) {
  return JSON.stringify(options, _utils.jsonStringifyReplacerSortKeys);
}