# Asuha
Asuha: the Webhook server for online git hosting services.

[![travis](https://travis-ci.org/momocow/Asuha.svg?branch=master)](https://github.com/momocow/Asuha)
[![npm](https://img.shields.io/npm/dt/asuha.svg)](https://www.npmjs.com/package/asuha)
[![npm](https://img.shields.io/npm/v/asuha.svg)](https://www.npmjs.com/package/asuha)

> WIP

> Currently only support for Bitbucket. There are other great packages for Github (e.g. [probot](https://probot.github.io/)) that you can have a try ;)

![Chigusa Asuha chan][1]

## Prerequisites
- Command `git` available in the system
> Module [`simple-git`](https://github.com/steveukx/git-js#dependencies) is used to find remote URLs of repositories.

## Installation
```
npm install asuha
```

## API
### Instance Method
#### set(configObj)
#### set(configKey, configValue)
See [Configuration](#configuration) for available configs.
- Parameters
    - `configObj` object
    - `configKey` string
    - `configValue` any
- Return
    - this

#### listen(...args)
It is an alias for [net.Server#listen()][5]. Read the document from Node official for information about parameters.
- Return
    - this

#### close(cb)
- Parameters
    - `cb` Function
- Return
    - this

#### claim(repoPath)
Claim the existing repository at the local path `repoPath`. This will fire `claim` and `init` events in order.
- Parameters
    - `repoPath` string
- Return
    - Promise<void>

#### disclaim(repoPath)
#### disclaim(repoHost, repoFullname)
Disclaim a repository specified by the `repoPath` or [ `repoHost`, `repoFullname` ] pair.
- Parameters
    - `repoPath` string
    - `repoHost` string
    - `repoFullname` string
- Return
    - Promise<void>

#### on(event, listener)
#### once(event, listener)
See [Events](#events) for available events and listener parameters.
> Note that listener can be either a normal function or an async function (or a function with `Promise` return type). Asuha adopts [`await-event-emitter`][6] as her event handling system; therefore, listeners are executed one by one in the order they were defined.

- Parameters
    - `event` object
    - `listener` Function
- Return
    - this

#### off(event)
#### off(event, listener)
Just like EventEmitter API, you can call this method with one parameter `event` to remove all listeners related to this event or specified the listener as the second parameter.
> **MUST** be called after `Asuha#listen()` has been called; otherwise, nothing happens.
- Parameters
    - `event` object
    - `listener` Function
- Return
    - this

### Static Method
#### http()
Creating a http server with Asuha as the request handler.
  - Return
    - Asuha

#### https(httpsOptions)
Creating a https server with Asuha as the request handler.
  - Parameters
    - `httpsOptions` object
        > Same as options for [https.createServer()][4]
  - Return
    - Asuha

#### express()
#### express(app)
> Optional dependencies `express` is required!

Creating an express server with Asuha as an express middleware. You can pass your custom express app as the first argument.

- Parameters
  - `app` express.Application
- Return
  - Asuha

### Configuration
This is the default public configuration for Asuha. Use [`Asuha#set()`](#setconfigobj) to change the settings.

```js
{
  cwd: process.cwd(),

  /**
   * Auto-scan the working directory to find local repositories.
   * Local Repo Scanning Algorithm is described as below.
   */
  autoScan: true,

  /**
   * default to ignore repository directories whose names start with '.' or '#';
   * you can use it to disable a repository
   * @type {string|RegExp}
   */
  match: /^[^.#].*$/,

  /**
   * Pre-configured repository mappings with local path. See the example.
   * @type {{ [repoHost: string]: { [repoFullname: string]: string } }}
   * @example {
   *    "github.com": {
   *      "momocow/Asuha": "/repo/asuha"
   *    }
   * }
   */
  repoMappings: {},

  /**
   * Each element is first constructed to a RegExp
   * then call its RegExp#test() to compare against the remote git event header.
   * @type {Array(string|RegExp)}
   */
  subscribedEvents: [ 'push' ],

  /**
   * Commands executed in serial by child_process#exec()
   * @type {string[]}
   */
  actions: [
    'git pull'
  ],

  /**
   * Stdio piping for each action
   */
  stdio: {
    /**
     * @type {Writable} 
     */
    stdout: process.stdout,

    /**
     * @type {Writable} 
     */
    stderr: process.stderr
  }
}
```

### Events
The following events are listed in the order which they are fired when a remote event is received.
> Note that `action.pre` and `action.post` can be fired multiple times in pair according to the number of configured actions.

- `init` fired only once after Asuha#init() called
    - `repoPath` string
    - `repoFullname` string
    - `host` string
- `claim` fired when a repository is claimed before an `init` event is fired
    - `repoPath` string
    - `repoFullname` string
    - `host` string
- `disclaim` fired when a repository is disclaimed
    - `repoPath` string
    - `repoFullname` string
    - `host` string
- `remote`
    - `repo` [RepoMeta](#repometa)
- `actions.pre`
    - `repo` [RepoMeta](#repometa)
    - `actions` string[]
    - `repoPath` string
- `action.pre`
    - `repo` [RepoMeta](#repometa)
    - `action` string
    - `repoPath` string
- `action.post`
    - `repo` [RepoMeta](#repometa)
    - `action` string
    - `repoPath` string
- `actions.post`
    - `repo` [RepoMeta](#repometa)
    - `actions` string[]
    - `repoPath` string
- `done`
    - `repo` [RepoMeta](#repometa)

### RepoMeta
For all remote events, see [Github][2] or [Bitbucket][3] webhook doc for more info.

```typescript
{
  /**
   * @example 'bitbucket.org'
   */
  host: string,

  /**
   * @example 'Asuha'
   */
  name: string,

  /**
   * @example 'momocow/Asuha'
   */
  fullname: string,

  /**
   * @example 'momocow'
   */
  owner: string,

  /**
   * the format of this field is host-specified
   * @example 'push' for Github; 'repo:push' for Bitbucket
   */
  event: string,

  /**
   * Empty if the event is not a push event
   * @example [{
   *  hash: '709d658dc5b6d6afcd46049c2f332ee3f515a67d',
   *  author: 'momocow <momocow.me@gmail.com>', // host-specified!
   *  message: 'new commit message\n',
   *  timestamp: new Date('2015-06-09T03:34:49+00:00'),
   * }]
   */
  commits: {
    hash: string,
    message: string,
    author: string,
    timestamp: Date
  }[]
}
```

### Example
1. Using `http` server with Asuha

[@see Asuha.test.js](./test/Asuha.test.js)

```javascript
// use .set() to configure
// use .on()/.once() to listen for Asuha events
const asuha = Asuha.http()
  .set('actions', [ 'git pull --rebase' ])
  .set('cwd', __dirname)
  .on('debug', console.debug.bind(console))
  .listen(/* Same args as http.Server.listen() */ function () {
    const { port, address } = asuha.server.address() // http.Server.address()
    console.debug('Asuha is listening at %s:%d', address, port)
  })
```

2. Using async listeners for Asuha

```javascript
// metrics
const ret = []
const start = Date.now()

asuha.on('init', async function () {
    ret.push(await setTimeout(() => 1, 2000))
})
    .on('init', function () {
        ret.push(2)
    })
    .on('init', async function () {
        ret.push(await setTimeout(() => 3, 3000))
    })
    .listen(function () {
        // ret.join('') === '123' 
        // Date.now() - start >= 5000
    })
```

[1]: https://ru.myanimeshelf.com/upload/dynamic/2016-07/24/1375382.jpg
[2]: https://developer.github.com/webhooks
[3]: https://confluence.atlassian.com/bitbucket/event-payloads-740262817.html
[4]: https://nodejs.org/api/https.html#https_https_createserver_options_requestlistener
[5]: https://nodejs.org/api/net.html#net_server_listen
[6]: https://github.com/imcuttle/node-await-event-emitter