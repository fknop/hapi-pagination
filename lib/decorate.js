'use strict';

const Hoek = require('hoek');


module.exports = function (config) {

  return {
    paginate: function (response, totalCount, options) {

      options = options || {};
      const key = options.key;

      if (!Array.isArray(response) && !key) {
        throw { message: 'Missing results key', code: 500 };
      }

      if (key && !response[key]) {
        throw { message: 'key: ' + key + 'does not exists on response', code: 500 };
      }

      const results = (key && !Array.isArray(response)) ? response[key] : response;

      if (key && !Array.isArray(response)) {
        delete response[key];
      }

      if (config.meta.location === 'header') {
        return this.response(results).header('total-count', totalCount);
      }

      return this.response({
        results: results,
        totalCount: totalCount,
        response: Array.isArray(response) ? null : response 
      });
    }
  };
};
