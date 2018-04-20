module.exports.setTimeout = function (fn, delay) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      try {
        resolve(fn())
      } catch (err) {
        reject(err)
      }
    }, delay)
  })
}
