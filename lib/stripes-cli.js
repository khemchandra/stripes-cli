#!/usr/bin/env node

const commander = require('commander');
const path = require('path');
const stripes = require('@folio/stripes-core/webpack/stripes-node-api');
const packageJson = require('../package.json');
const loadConfig = require('./load-config');
const createApp = require('./create-app');
const context = require('./cli-context')();

process.title = 'stripes-cli';
commander.version(packageJson.version);

// Display webpack output to the console
function processStats(err, stats) {
  if (err) {
    console.error(err);
  }
  console.log(stats.toString({
    chunks: false,
    colors: true,
  }));
  // Check for webpack compile errors and exit
  if (err || stats.hasErrors()) {
    process.exit(1);
  }
}

// Webpack config override:
// Include CLI's own stripes-core/node_modules for module resolution
// TODO: Confirm - This may only be needed when running the CLI globally
function cliResolve(config) {
  const cliCoreModulePath = path.join(__dirname, '..', 'node_modules');
  config.resolve.modules.push(cliCoreModulePath);
  config.resolveLoader.modules.push(cliCoreModulePath);
  return config;
}

// Webpack config override:
// Alias to support serving from within app's own directory without linking
function cliAppAlias(config) {
  const cwd = path.resolve();
  if (context.moduleName && context.moduleName !== '') {
    config.resolve.alias[context.moduleName] = cwd;
  }
  return config;
}

commander
  .command('serve')
  .alias('dev')
  .option('--port [port]', 'Port')
  .option('--host [host]', 'Host')
  .option('--cache', 'Use HardSourceWebpackPlugin cache')
  .option('--devtool [devtool]', 'Use another value for devtool instead of "inline-source-map"')
  .arguments('[config]')
  .description('Launch a webpack-dev-server')
  .action((stripesConfigFile, options) => {
    const stripesConfig = loadConfig(stripesConfigFile, context);

    if (context.type === 'app') {
      options.webpackOverrides = config => cliResolve(cliAppAlias(config));
    } else {
      options.webpackOverrides = cliResolve;
    }

    stripes.serve(stripesConfig, options);
  });

commander
  .command('build')
  .option('--publicPath [publicPath]', 'publicPath')
  .arguments('[config] [output]')
  .description('Build a tenant bundle')
  .action((stripesConfigFile, outputPath, options) => {
    const stripesConfig = loadConfig(stripesConfigFile, context);

    if (context.type === 'app') {
      options.webpackOverrides = config => cliResolve(cliAppAlias(config));
    } else {
      options.webpackOverrides = cliResolve;
    }

    if (outputPath) {
      options.outputPath = outputPath;
    }
    stripes.build(stripesConfig, options, processStats);
  });

commander
  .command('new')
  .arguments('<moduleType> <moduleName>')
  .option('--install', 'Install dependencies')
  .description('Create a new Stripes module')
  .action((moduleType, moduleName, options) => {
    if (moduleType !== 'app') {
      console.log('Only "app" modules are currently supported');
      return;
    }

    // TODO: Verify destination folder
    if (context.type !== 'empty') {
      console.log('Existing package.json found. Nothing created.');
      return;
    }

    console.log('Creating app...');
    createApp(moduleName).then(() => {
      // cd to new app and install dependencies
    });
  });

commander
  .command('test')
  .description('Run tests')
  .action(() => {
    console.log('Test not implemented');
  });

console.log(`\nstripes-cli ${packageJson.version}`);
console.log(`context: ${context.type}; name: ${context.moduleName}; running: ${context.isGlobalCli ? 'globally' : 'locally'}`);

commander.parse(process.argv);

// output help if no command specified
if (!process.argv.slice(2).length) {
  commander.outputHelp();
}
console.log('');