const clone = require('./clone')

module.exports = function (desc, ...clazzes) {
  const superArgs = typeof clazzes[clazzes.length - 1] === 'object' ? clazzes[clazzes.length - 1] : {}

  Object.assign(desc.prototype, ...clazzes.map(function (clazz) { return clazz.prototype }))
  desc.__super__ = function (thisObj) {
    const cloneObj = clone({}, thisObj)

    clazzes.forEach(function (Clazz) {
      const ins = Array.isArray(superArgs[Clazz.name]) && superArgs[Clazz.name].length > 0
        ? new Clazz(...superArgs[Clazz.name]) : new Clazz()
      clone(thisObj, ins)
    })

    clone(thisObj, cloneObj)
  }
}
