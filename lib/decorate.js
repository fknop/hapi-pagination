'use strict';

const Hoek = require('hoek');

module.exports = function(config) {
    return {
        paginate: function(results, totalCount) {
            Hoek.assert(Array.isArray(results), '#reply.' + config.reply.paginate + ' results must be an array.');

            return this.response({ results: results, totalCount: totalCount });
        }
    };
};
