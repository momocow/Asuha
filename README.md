# Asuha
Asuha: the Webhook server for online git hosting services.

![Chigusa Asuha chan][1]

## Installation
- Install from Github with npm, `npm i momocow/Asuha`
- Set up dependencies, `npm install`

## CLI
> Document is WIP

## API
### Events
The following events are listed in the order which they are fired when a remote event is received.
> Note that `action.pre` and `action.post` can be fired multiple times according to the number of configured actions.

- `remote`
    - `repo` RepoMeta
- `actions.pre`
    - `repo` RepoMeta
    - `actions` string[]
- `action.pre`
    - `repo` RepoMeta
    - `action` string
- `action.post`
    - `repo` RepoMeta
    - `action` string
- `actions.post`
    - `repo` RepoMeta
    - `actions` string[]
- `done`
    - `repo` RepoMeta

### RepoMeta
For all remote events, see [Github][2] or [Bitbucket][3] webhook doc for more info.

```typescript
{
  /**
   * @example `momocow/Asuha`
   */
  fullname: string,

  /**
   * @example `momocow`
   */
  owner: string,

  /**
   * the format of this field is host-specified
   * @example `push` for Github; `repo:push` for Bitbucket
   */
  event: string
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