'use strict';

const Boom = require('boom');

module.exports = function (config) {

    return {
        paginate: function (response, totalCount, options) {

            options = options || {};
            const key = options.key;

            if (!Array.isArray(response) && !key) {
                throw Boom.internal('Missing results key');
            }

            if (key && !response[key]) {
                throw Boom.internal('key: ' + key + 'does not exists on response');
            }

            const results = (key && !Array.isArray(response)) ? response[key] : response;

            if (key && !Array.isArray(response)) {
                delete response[key];
            }

            if (config.meta.location === 'header') {
                return this.response(results).header('total-count', totalCount);
            }

            return this.response({
                results,
                totalCount,
                response: Array.isArray(response) ? null : response
            });
        }
    };
};
