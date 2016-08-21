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

    try {

        const config = Config.getConfig(server, options);

        // For simplicity
        config.meta.page.name = config.query.page.name;
        config.meta.limit.name = config.query.limit.name;

        // Sets uri for generated link
        config.uri = config.meta.baseUri || server.info.uri;

        const decorate = require('./decorate')(config);
        const ext      = require('./ext')(config, server);

        try {
            server.decorate('reply', config.reply.paginate, decorate.paginate);
        } catch (err) {
            // Decoration can be defined once for the entire server.
            // Error: Reply interface decoration already defined.
        }

        server.ext('onPreHandler', ext.onPreHandler);
        server.ext('onPreResponse', ext.onPreResponse);

        return next();

    }
    catch (error) {
        return next(error);
    }


};

exports.register.attributes = {
    pkg: require('../package.json')
};
