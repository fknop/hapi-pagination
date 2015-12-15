'use strict';

const Config = require('./config');

exports.register = function (server, options, next) {

    if (server.connections.length !== 1) {
        return next({
            name: 'ValidationError',
            details: {
                message: 'You cannot register this plugin for two connections at once. \n' +
                     'Register it for each connection on your server.',
                context: server.connections
            }
        });
    }
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
