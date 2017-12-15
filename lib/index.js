'use strict';

const Config = require('./config');
const Ext = require('./ext');

exports.plugin = {
    pkg: require('../package.json'),
    name: 'hapi-pagination',
    register: function (server, options) {

        const result = Config.getConfig(server, options);

        if (result.error) {
            return next(result.error);
        }

        const config = result.config;

        if (typeof config.meta.baseUri === 'undefined' && server.info === null) {
            return next({
                name: 'ValidationError',
                details: {
                    message: 'You cannot register this plugin for multiple connections at once without providing the baseUri configuration option.',
                    context: server.connections
                }
            });
        }

        // For simplicity
        config.meta.page.name = config.query.page.name;
        config.meta.limit.name = config.query.limit.name;

        // Sets uri for generated link
        config.uri = typeof config.meta.baseUri !== 'undefined' ? config.meta.baseUri : server.info.uri;

        const decorate = require('./decorate')(config);
        const ext = new Ext(config);

        try {
            server.decorate('toolkit', config.reply.paginate, decorate.paginate);
        }
        catch (err) {
            // Decoration can be defined once for the entire server.
            // Error: Reply interface decoration already defined.
        }

        server.ext('onPreHandler', (server, reply) => ext.onPreHandler(server, reply));
        server.ext('onPostHandler', (server, reply) => ext.onPostHandler(server, reply));
    }
};