# Asuha
Asuha: the Webhook server for online git hosting services.

![travis](https://travis-ci.org/momocow/Asuha.svg?branch=master)
[![npm](https://img.shields.io/npm/dt/asuha.svg)](https://www.npmjs.com/package/asuha)
[![npm](https://img.shields.io/npm/v/asuha.svg)](https://www.npmjs.com/package/asuha)

> WIP

> Currently only support for Bitbucket. There are other great packages for Github (e.g. [probot](https://probot.github.io/)) that you can have a try ;)

![Chigusa Asuha chan][1]

## Installation
- Install from Github with npm, `npm i asuha`
    - For CLI usage, `npm i asuha -g`
- Set up dependencies, `npm install`
    - Optional dependencies are `commander.js` and `express`, if in your use case, none of those above is required (i.e. you are not using as CLI command and you prefer builtin `http`/`https` server), you can install dependencies without them through
    `npm install --no-optional`

## CLI
> Document is WIP

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

#### on(event, listener)
#### once(event, listener)
See [Events](#events) for available events and listener parameters.
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
  subscribeEvents: [ 'push' ],

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

[1]: https://ru.myanimeshelf.com/upload/dynamic/2016-07/24/1375382.jpg
[2]: https://developer.github.com/webhooks
[3]: https://confluence.atlassian.com/bitbucket/event-payloads-740262817.html
[4]: (https://nodejs.org/api/https.html#https_https_createserver_options_requestlistener)