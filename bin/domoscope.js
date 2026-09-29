#!/usr/bin/env node

/**
 * DomoScope CLI Entry Point
 * Local-First Repository Intelligence & Developer Experience Platform
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const projectRoot = path.resolve(__dirname, '..');
const jiti = require('jiti')(projectRoot);

const { runCli } = jiti('./src/services/local/localCli.ts');

runCli(process.argv.slice(2))
  .then((exitCode) => {
    process.exit(typeof exitCode === 'number' ? exitCode : 0);
  })
  .catch((err) => {
    console.error(`\x1b[31m[DomoScope Fatal Error]\x1b[0m`, err);
    process.exit(1);
  });
