const clone = require('./clone')

module.exports = function (desc, ...clazzes) {
  const superArgs = typeof clazzes[clazzes.length - 1] === 'object' ? clazzes[clazzes.length - 1] : {}

  Object.assign(desc.prototype, ...clazzes.map(function (clazz) { return clazz.prototype }))

  return new Proxy(desc, {
    construct: function (Target, args) {
      const baseObj = new Target(...args)
      const cloneObj = clone({}, baseObj)

      clazzes.forEach(function (Clazz) {
        const ins = Array.isArray(superArgs[Clazz.name]) && superArgs[Clazz.name].length > 0
          ? new Clazz(...superArgs[Clazz.name]) : new Clazz()
        return clone(baseObj, ins)
      })

      return clone(baseObj, cloneObj)
    }
  })
}
