const fs = require('fs')
const path = require('path')
const exec = require('child_process').exec
const git = require('simple-git/promise')
const { Readable, Writable } = require('stream')
const _merge = require('lodash.merge')

const Bitbucket = require('./host/Bitbucket')

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

      const [ , host, fullname ] = gitUrl.match(/^.*?([^@]*)[:/]([a-zA-Z\-_]+\/[a-zA-Z\-_]+)\.git$/) || []
      _merge(ret, {
        [host]: {
          [fullname]: path.join(dir, subdir)
        }
      })
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
      subscribeEvents: options.subscribeEvents
    })
  ]

  return async function midware (req, res, next) {
    next = typeof next !== 'function' ? function (err) {
      options.onerror(err)
    } : next

    for (const host of hosts) {
      if (host.claim(req)) { // which host
        const { fullname } = await host.parse(req) // which repository
        const dns = host.getDomainName()
        const localRepo = repoMap[dns][fullname] // where is local repository

        if (!localRepo.trim()) return // local repository path does not exist

        // no local repo but a remote git event is received
        if (!fs.existsSync(path.join(localRepo, '.git', 'config'))) {
          // will not try to clone a private repository through https due to security issue
          const remote = options.cloneScheme === 'ssh'
            ? `git@${dns}:${fullname}.git` : `https://${dns}/${fullname}.git`
          try {
            await git().clone(remote)
          } catch (err) {
            next(err)
            return
          }
        }

        try {
          for (const action of options.actions) {
            await doAction(action, repoMap[dns][fullname], options.stdio)
          }
        } catch (err) {
          next(err)
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
   * @type {{[repoHost: string]: { [repoFullname: string]: string }}}
   * @example {
   *    "github.com": {
   *      "momocow/asuha": "/repo/asuha"
   *    }
   * }
   */
  repoMappings: {},
  subscribeEvents: [ 'push' ],
  actions: [
    'git pull'
  ],
  stdio: {
    stdout: process.stdout,
    stderr: process.stderr
  },
  onerror: function (err) {
    console.error('[Error]')
    console.error('%O', err)
  },
  cloneScheme: 'ssh'
}

module.exports = getMidware
