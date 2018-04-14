/**
 * This function mutate target object
 * @param {Object} target
 * @param {...Object} source
 */
module.exports = function (target, ...sources) {
  sources.forEach(function (source) {
    Object.getOwnPropertyNames(source)
      .concat(Object.getOwnPropertySymbols(source))
      .forEach((prop) => {
        if (!prop.match(/^(?:constructor|prototype|arguments|caller|name|bind|call|apply|toString|length)$/)) {
          Object.defineProperty(target, prop, Object.getOwnPropertyDescriptor(source, prop))
        }
      })
  })

  return target
}
