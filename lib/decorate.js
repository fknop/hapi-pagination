'use strict';

const Hoek = require('hoek');

module.exports = function (config) {

    return {
        paginate: function (response, totalCount, options) {
            
            options = options || {};
            const key = options.resultKey;

            Hoek.assert(Array.isArray(response) && !key, '#reply.' + config.reply.paginate + ' results must be an array.');
            
            const results = key ? response[key] : response;
            
            if (key) {
                delete response[key]
            }
            
            return this.response({ results: results, totalCount: totalCount, source: response });
        }
    };
};
