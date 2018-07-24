## Asuha
Asuha: the Webhook server for online git hosting services.

[![travis](https://travis-ci.org/momocow/Asuha.svg?branch=master)](https://github.com/momocow/Asuha)
[![npm](https://img.shields.io/npm/dt/asuha.svg)](https://www.npmjs.com/package/asuha)
[![npm](https://img.shields.io/npm/v/asuha.svg)](https://www.npmjs.com/package/asuha)

> WIP

> Currently only support for Bitbucket. There are other great packages for Github (e.g. [probot](https://probot.github.io/)) that you can have a try ;)

![Chigusa Asuha chan][1]

## Base Concepts
- Asuha is designed as a module to report remote Git events through EventEmitter API.

## Installation
```
npm install asuha
```

## Example

```js
const Asuha = require('asuha')

const asuha = Asuha.http()
  .addRepo('git@bitbucket.org:user/repo.git')
  .listen(function () {
    const { address, port } = asuha.server().address()
    console.log('Asuha is listening on %s:%d', address, port)
  })
```

Then set the repository's webhook to where the Asuha server is listening on and make a Git push to the remote repository to test the server.

[1]: https://ru.myanimeshelf.com/upload/dynamic/2016-07/24/1375382.jpg