const AwaitEventEmitter = require('await-event-emitter')
const fs = require('fs')
const path = require('path')
const exec = require('child_process').exec
const { Readable, Writable } = require('stream')
const Callable = require('callable-instance')
const extend = require('../util/extend')
const _merge = require('lodash.merge')
const _get = require('lodash.get')

const { LocalRepoNotFoundError } = require('./errors')
const Bitbucket = require('./host/Bitbucket')

function scanRepo (dir, subdir) {
  const dotGit = path.join(dir, subdir, '.git')
  const gitDir = fs.lstatSync(dotGit).isFile()
    ? fs.readFileSync(dotGit, 'utf8').match(/gitdir:([^\n]*)/)[1].trim()
    : dotGit
  const content = fs.readFileSync(path.join(gitDir, 'config'), 'utf8')
  const sectionSplitter = /\[remote [^\]]*\]([^[]*)/g // all remote
  let matched
  while ((matched = sectionSplitter.exec(content)) !== null) {
    const gitUrl = matched[1].split('\n').filter(function (prop) {
      return prop.toLowerCase().includes('url')
    }).map(function (prop) {
      return prop.split('=').map(_tok => _tok.trim())
    })[0][1]
    return gitUrl.match(/^.*?([^@]*)[:/]([a-zA-Z\-_]+\/[a-zA-Z\-_]+)\.git$/) || []
  }
}

/**
 * @param {string} dir
 * @param {{match: string|RegExp}} options
 */
function scanLocalRepos (dir, options) {
  options = Object.assign({}, scanLocalRepos.DEFAULT_OPTIONS, options)
  const ret = {}
  fs.readdirSync(dir, 'utf8').filter(function (subdir) {
    return subdir.match(options.match) !== null && fs.existsSync(path.join(dir, subdir, '.git'))
  }).forEach(function (subdir) {
    const [ , host, fullname ] = scanRepo(dir, subdir)

    if (host && fullname) {
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
    const proc = exec(action, { cwd }, function (err, stdout, stderr) {
      if (err) {
        reject(err)
        return
      }

      resolve({ stdout, stderr })
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

/**
 * @param {SocketIO.Server} sio
 * @param {object} options
 */
function getMidware (options) {
  options = _merge({}, getMidware.DEFAULT_OPTIONS, options)

  return new AsuhaMidware(options)
}

getMidware.DEFAULT_OPTIONS = {
  cwd: process.cwd(),
  autoScan: true,
  /**
   * @type {string|RegExp} defaults to ignore files and directories whose names start with '.' or '#'
   */
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
  }
}

/**
 * @extends AwaitEventEmitter
 * @event error
 * @event remote { fullname, owner, event, commits }
 * @event action.pre { fullname, owner, event, commits }, action
 * @event action.post { fullname, owner, event, commits }, action
 * @event actions.pre { fullname, owner, event, commits }, actions
 * @event actions.post { fullname, owner, event, commits }, actions
 * @event done { fullname, owner, event, commits }
 * @event debug
 */
class AsuhaMidware extends Callable {
  constructor (options) {
    super('__call__')
    // init all parent class inherited from #extend()
    AsuhaMidware.__super__(this)

    this.options = options
    this.hosts = [
      new Bitbucket({
        subscribeEvents: options.subscribeEvents,
        whitelistIPs: options.whitelistIPs
      })
    ]
    this.repoMap = Object.assign({}, options.repoMappings)
  }

  async init () {
    if (this.options.autoScan) {
      Object.assign(this.repoMap, scanLocalRepos(this.options.cwd, { match: this.options.match }))
    }

    for (const host of Object.keys(this.repoMap)) {
      for (const repo of Object.keys(this.repoMap[host])) {
        await this.emit('init', this.repoMap[host][repo], repo, host)
      }
    }

    return this
  }

  async claim (repoPath) {
    const [ , host, fullname ] = scanRepo(path.resolve(process.cwd(), repoPath), '')

    if (!host || !fullname) {
      return
    }

    if (!this.repoMap[host]) {
      this.repoMap[host] = {}
    }
    this.repoMap[host][fullname] = repoPath

    await this.emit('claim', repoPath, fullname, host)
    await this.emit('init', repoPath, fullname, host)
  }

  async disclaim (remoteHost, fullname) {
    if (arguments.length === 1) {
      [ , remoteHost, fullname ] = scanRepo(remoteHost, '')
    }

    if (!this.repoMap[remoteHost] || !this.repoMap[remoteHost][fullname]) {
      return
    }

    const repoPath = this.repoMap[remoteHost][fullname]

    delete this.repoMap[remoteHost][fullname]

    if (Object.keys(this.repoMap[remoteHost]) === 0) {
      delete this.repoMap[remoteHost]
    }

    await this.emit('disclaim', repoPath, fullname, remoteHost)
  }

  async __call__ (req, res, next) {
    next = typeof next === 'function' ? next : function () {
      res.writeHead(404)
      res.end()
    }

    for (const host of this.hosts) {
      try {
        host.claim(req) // which host
      } catch (err) {
        await this.emit('debug', 'Host Handler %o failed to claim the request.', host.name)
        await this.emit('debug', '%O', err)
        await this.emit('debug', 'Try next one.')
        continue
      }

      await this.emit('debug', 'Host Handler: %o', host.name)

      // which repository
      const repoMata = await host.parse(req)
      const dns = host.getDomainName()
      repoMata.host = dns // PATCH

      // where is local repository
      const localRepo = _get(this.repoMap, [ dns, repoMata.fullname ])

      res.writeHead(200)
      res.end()

      await this.emit('remote', repoMata)

      await this.emit('debug', 'Repository meta: %o', repoMata)
      await this.emit('debug', 'Local path: %o', localRepo)

      if (!localRepo) {
        await this.emit('error', new LocalRepoNotFoundError(dns, repoMata.fullname))
        return
      }

      await this.emit('actions.pre', repoMata, this.options.actions, localRepo)
      try {
        for (const action of this.options.actions) {
          await this.emit('debug', '- Action: %o', action)
          await this.emit('action.pre', repoMata, action, localRepo)
          await this.emit('action.post', repoMata, action, localRepo, await doAction(action, localRepo, this.options.stdio))
        }
      } catch (err) {
        await this.emit('error', err)
      }
      await this.emit('actions.post', repoMata, this.options.actions, localRepo)
      await this.emit('done', repoMata)
      return
    }

    next()
  }
}

extend(AsuhaMidware, AwaitEventEmitter)

module.exports = getMidware
