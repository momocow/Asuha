# Asuha
Asuha: the Webhook server for online git hosting services.

![Chigusa Asuha chan][1]

## Installation
- Install from Github with npm, `npm i momocow/Asuha`
- Set up dependencies, `npm install`

## CLI
> Document is WIP

## API
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