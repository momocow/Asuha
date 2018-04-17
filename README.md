# Asuha
Asuha: the Webhook server for online git hosting services.

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
    - `this` Asuha

#### on(event, listener)
#### once(event, listener)
See [Events](#events) for available events and listener parameters.
- Parameters
    - `event` object
    - `listener` Function
- Return
    - `this` Asuha

#### off(event)
#### off(event, listener)
Just like EventEmitter API, you can call this method with one parameter `event` to remove all listeners related to this event or specified the listener as the second parameter.
> **MUST** be called after `Asuha#listen()` has been called; otherwise, nothing happens.
- Parameters
    - `event` object
    - `listener` Function
- Return
    - `this` Asuha

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
   * @type {string|RegExp} defaults to ignore repository directories whose names start with '.' or '#'; you can use it to disable a repository
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
- `action.pre`
    - `repo` [RepoMeta](#repometa)
    - `action` string
- `action.post`
    - `repo` [RepoMeta](#repometa)
    - `action` string
- `actions.post`
    - `repo` [RepoMeta](#repometa)
    - `actions` string[]
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
   *  author: 'username',
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