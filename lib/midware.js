const { EventEmitter } = require('events')
const fs = require('fs')
const path = require('path')
const exec = require('child_process').exec
const { Readable, Writable } = require('stream')
const isPlainObj = require('is-plain-object')
const Callable = require('callable-instance')
const _merge = require('lodash.merge')
const _get = require('lodash.get')

const { LocalRepoNotFoundError } = require('./errors')
const { Publisher, Publishable } = require('./Publisher')
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

/**
 * @param {SocketIO.Server} sio
 * @param {object} options
 */
function getMidware (sio, options) {
  if (isPlainObj(sio)) {
    [ options, sio ] = [ sio, options ]
  }

  const publisher = sio ? new Publisher(sio) : new Publishable()

  options = _merge({}, getMidware.DEFAULT_OPTIONS, options)

  const DEBUG = options.ondebug
  const repoMap = Object.assign({}, options.repoMappings)

  if (options.autoScan) {
    Object.assign(repoMap, scanLocalRepos(options.cwd, { match: options.match }))
  }

  DEBUG('Repository mappings: %o', repoMap)

  const hosts = [
    new Bitbucket({
      subscribeEvents: options.subscribeEvents
    })
  ]

  // return async function midware (req, res, next) {
  //   next = typeof next === 'function' ? next : function () {}
  //   const nextWrapper = function (err, dns, fullname) {
  //     if (err) {
  //       if (dns && fullname) publisher.publish(dns, fullname, 'error', err)
  //       options.onerror(err)
  //       next(err)
  //       return
  //     } else {
  //       DEBUG('#next()')
  //     }

  //     next()
  //   }

  //   for (const host of hosts) {
  //     try {
  //       host.claim(req) // which host
  //     } catch (err) {
  //       DEBUG('Host Handler %o failed to claim the request.', host.name)
  //       DEBUG('%O', err)
  //       DEBUG('Try next one.')
  //       continue
  //     }

  //     DEBUG('Host Handler: %o', host.name)

  //     // which repository
  //     const { fullname, owner, event } = await host.parse(req)
  //     const dns = host.getDomainName()
  //     // where is local repository
  //     const localRepo = _get(repoMap, [ dns, fullname ])

  //     publisher.publish(dns, fullname, 'remote event', event)

  //     DEBUG('Request meta: %o', { host: dns, fullname, owner, event })
  //     DEBUG('Local path: %o', localRepo)

  //     if (!localRepo) {
  //       nextWrapper(new LocalRepoNotFoundError(dns, fullname), dns, fullname)
  //       return
  //     }

  //     publisher.publish(dns, fullname, 'action:pre')
  //     try {
  //       for (const action of options.actions) {
  //         DEBUG('- Action: %o', action)
  //         await doAction(action, localRepo, options.stdio)
  //       }
  //     } catch (err) {
  //       nextWrapper(err, dns, fullname)
  //     }
  //     publisher.publish(dns, fullname, 'action:post')
  //     publisher.publish(dns, fullname, 'done')
  //     return
  //   }

  //   nextWrapper()
  // }
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
    console.error('\u001b[31m[Error] %s\u001b[39m', err)
    console.trace()
  },
  ondebug: function (...args) {
    console.debug('\u001b[90m[Debug] ' + args.shift() + '\u001b[39m', ...args)
  }
}

class AsuhaMidware extends Callable {
  constructor () {
    super('__call__')

    EventEmitter.call(this)
    Object.setPrototypeOf(this, EventEmitter.prototype)
  }

  async __call__ (req, res, next) {
    next = typeof next === 'function' ? next : function () {}
    const nextWrapper = function (err, dns, fullname) {
      if (err) {
        if (dns && fullname) publisher.publish(dns, fullname, 'error', err)
        options.onerror(err)
        next(err)
        return
      } else {
        DEBUG('#next()')
      }

      next()
    }

    for (const host of hosts) {
      try {
        host.claim(req) // which host
      } catch (err) {
        DEBUG('Host Handler %o failed to claim the request.', host.name)
        DEBUG('%O', err)
        DEBUG('Try next one.')
        continue
      }

      DEBUG('Host Handler: %o', host.name)

      // which repository
      const { fullname, owner, event } = await host.parse(req)
      const dns = host.getDomainName()
      // where is local repository
      const localRepo = _get(repoMap, [ dns, fullname ])

      publisher.publish(dns, fullname, 'remote event', event)

      DEBUG('Request meta: %o', { host: dns, fullname, owner, event })
      DEBUG('Local path: %o', localRepo)

      if (!localRepo) {
        nextWrapper(new LocalRepoNotFoundError(dns, fullname), dns, fullname)
        return
      }

      publisher.publish(dns, fullname, 'action:pre')
      try {
        for (const action of options.actions) {
          DEBUG('- Action: %o', action)
          await doAction(action, localRepo, options.stdio)
        }
      } catch (err) {
        nextWrapper(err, dns, fullname)
      }
      publisher.publish(dns, fullname, 'action:post')
      publisher.publish(dns, fullname, 'done')
      return
    }

    nextWrapper()
  }
}

module.exports = getMidware
