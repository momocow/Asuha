module.exports = function contain (a, b) {
  if (typeof a !== 'object' || typeof b !== 'object') return a === b
  for (let k of Object.keys(b)) {
    if (!contain(a[k], b[k])) return false
  }
  return true
}
