#!/usr/bin/env node
const commander = require('commander')
const { join } = require('path')

const Asuha = require('../lib/Asuha')

const { version } = require('../package.json')

const program = commander
  .version(version)
  .option('-p,--port <port>', 'Port to listen', parseInt)
  .option('-a,--host <host>', 'Host to bind', '0.0.0.0')
  .option('-d,--cwd <cwd>', 'Root directory whose child directories are repository directories.', process.cwd())
  .option('-f,--file <config-file>', 'Configuration file (*.js or *.json)')
  .option('-v,--verbose', 'verbose', false)
  .parse(process.argv)

const configFromFile = (function () {
  try {
    return require(program.file || join(process.cwd(), 'asuha.json'))
  } catch (err) {
    return {}
  }
})()

const port = program.port || configFromFile.port || 7766
const host = program.host || configFromFile.host || '0.0.0.0'
const cwd = program.cwd || process.cwd()

const asuha = Asuha.http()

asuha.set({ cwd })
if (!program.verbose) {
  asuha.set('ondebug', function () {})
}

const server = asuha.listen(port, host, function () {
  const { port, address } = server.address()
  console.log('Asuha is listening at %s:%d', address, port)
})
