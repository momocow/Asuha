const fs = require('fs')
const path = require('path')
const exec = require('child_process').exec
const { format } = require('util')
const { Readable, Writable } = require('stream')
const _merge = require('lodash.merge')

const Bitbucket = require('./host/Bitbucket')

const TPL_GIT_HTTPS = 'https://%s/%s.git'
const TPL_GIT_SSH = 'git@%s:%s.git'

/**
 * @param {string} dir
 * @param {{match: string|RegExp}} options
 */
function scanLocalRepos (dir, options) {
  options = Object.assign({}, scanLocalRepos.DEFAULT_OPTIONS, options)
  const ret = {}
  fs.readdirSync(dir, 'utf8').filter(function (subdir) {
    return subdir.match(options.match) !== null && fs.existsSync(path.join(dir, subdir, '.git', 'config'))
  }).forEach(function (subdir) {
    const content = fs.readFileSync(path.join(dir, subdir, '.git', 'config'), 'utf8')
    const sectionSplitter = /\[remote.*\]([^[]*)/g
    let matched
    while ((matched = sectionSplitter.exec(content)) !== null) {
      const gitUrl = matched[1].split('\n').filter(function (prop) {
        return prop.toLowerCase().includes('url')
      }).map(function (prop) {
        return prop.split('=').map(_tok => _tok.trim())
      })[0][1]

      ret[gitUrl] = path.join(dir, subdir)
    }
  })
  return ret
}

scanLocalRepos.DEFAULT_OPTIONS = {
  match: /^[^.#].*$/
}

function doAction (action, cwd, stdio) {
  return new Promise(function (resolve, reject) {
    const proc = exec(action, { cwd }, function (err) {
      if (err) {
        reject(err)
        return
      }

      resolve()
    })

    if (stdio.stdin instanceof Readable) {
      stdio.stdin.pipe(proc.stdin)
    }

    if (stdio.stdout instanceof Writable) {
      proc.stdout.pipe(stdio.stdout)
    }

    if (stdio.stderr instanceof Writable) {
      proc.stderr.pipe(stdio.stderr)
    }
  })
}

function getMidware (options) {
  options = _merge({}, getMidware.DEFAULT_OPTIONS, options)
  const repoMap = Object.assign({}, options.repoMappings)

  if (options.autoScan) {
    Object.assign(repoMap, scanLocalRepos(options.cwd, { match: options.match }))
  }

  const hosts = [
    new Bitbucket({
      subscribeEvents: options.subscribeEvents,
      whitelistIPs: options.whitelistIPs
    })
  ]

  return async function midware (req, res, next) {
    for (const host of hosts) {
      if (host.claim(req)) { // which host
        const { fullname } = await host.parse(req) // which repository
        const dns = host.getDomainName()
        const urls = [ // where is its local path
          format(TPL_GIT_HTTPS, dns, fullname),
          format(TPL_GIT_SSH, dns, fullname)
        ].filter(function (url) {
          return url in repoMap
        })

        try {
          for (const url of urls) {
            for (const action of options.actions) {
              await doAction(action, repoMap[url], options.stdio)
            }
          }
        } catch (err) {
          options.onerror(err)
        }

        return
      }
    }

    next()
  }
}

getMidware.DEFAULT_OPTIONS = {
  cwd: process.cwd(),
  autoScan: true,
  match: /^[^.#].*$/,

  /**
   * @type {{[repoURL: string]: string}}
   */
  repoMappings: {},
  subscribe: [ 'push' ],
  actions: [
    'git pull', 'npm restart'
  ],
  stdio: {
    stdout: process.stdout,
    stderr: process.stderr
  },
  onerror: console.error.bind(console)
}

module.exports = getMidware
