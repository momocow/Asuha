let now = Date.now()

require('fs').writeFileSync('last-modified', `${now}`)

console.log('Test [%d]', now)
