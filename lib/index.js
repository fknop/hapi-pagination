'use strict';

const Hoek = require('hoek');
const Config = require('./config');

exports.register = function (server, options, next) {

    Hoek.assert(server.connections.length === 1,
                'You cannot register this plugin for two connections at once. ' +
                'Register it for each connection on your server.');

    const config = Config.getConfig(options);
    config.uri   = server.info.uri;

    const decorate = require('./decorate')(config);
    const ext      = require('./ext')(config);

    server.decorate('reply', config.reply.paginate, decorate.paginate);
    server.ext('onPreHandler', ext.onPreHandler);
    server.ext('onPreResponse', ext.onPreResponse);

    next();
};

exports.register.attributes = {
    name: require('../package.json').name,
    version: require('../package.json').version
};
