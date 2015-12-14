'use strict';

const Hoek = require('hoek');
const Config = require('./config');

exports.register = function (server, options, next) {

    Hoek.assert(server.connections.length === 1,
                'You cannot register this plugin for two connections at once. ' +
                'Register it for each connection on your server.');

    const results = Config.getConfig(options);

    if (results.error) {
        return next(results.error);
    }

    const config = results.value;

    // For simplicity
    config.meta.page.name = config.query.page.name;
    config.meta.limit.name = config.query.limit.name;

    // Sets uri for generated link
    config.uri = config.meta.baseUri || server.info.uri;

    const decorate = require('./decorate')(config);
    const ext      = require('./ext')(config);

    server.decorate('reply', config.reply.paginate, decorate.paginate);
    server.ext('onPreHandler', ext.onPreHandler);
    server.ext('onPreResponse', ext.onPreResponse);

    return next();
};

exports.register.attributes = {
    pkg: require('../package.json')
};
