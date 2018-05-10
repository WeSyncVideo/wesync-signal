const path = require('path')

exports.resolveRoot = function (file) {
  const root = path.resolve('.')

  return path.join(root, file)
}
