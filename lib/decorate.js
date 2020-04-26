const Boom = require('@hapi/boom')

module.exports = function (config) {
  return {
    paginate: function (response, totalCount, options) {
      options = options || {}
      const key = options.key

      if (Array.isArray(response) && key) {
        throw Boom.internal('Object required with results key')
      }

      if (!Array.isArray(response) && !key) {
        throw Boom.internal('Missing results key')
      }

      if (key && !response[key]) {
        throw Boom.internal('key: ' + key + 'does not exists on response')
      }

      const results = key ? response[key] : response
      if (key) {
        delete response[key]
      }

      if (config.meta.location === 'header') {
        return this.response(results).header('total-count', totalCount)
      }

      return this.response({
        results,
        totalCount,
        response: Array.isArray(response) ? null : response
      })
    }
  }
}
