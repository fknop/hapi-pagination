'use strict';

const Utils = require('./utils');
const Boom = require('boom');
const Hoek = require('hoek');
const Qs = require('querystring');

const internals = {
    configs: {}
};

internals.getConfig = function(request) {
    return internals.configs[request.connection.info.id];
};

internals.getRouteOptions = function(request) {

    return request.route.settings.plugins.pagination || {};
};

internals.containsPath = function(array, path) {

    return Utils.some(array, (item) => {

        return item instanceof RegExp ? item.test(path) : item === path;
    });
};

internals.isValidRoute = function(request) {
    const config = internals.getConfig(request);

    const include = config.routes.include;
    const exclude = config.routes.exclude;
    const options = internals.getRouteOptions(request);
    const path = request.route.path;
    const method = request.route.method;

    if (!Utils.isUndefined(options.enabled)) {
        return options.enabled;
    }

    return (
        (method === 'get') &&
        (include[0] === '*' || internals.containsPath(include, path)) &&
        (!internals.containsPath(exclude, path))
    );
};

internals.getPagination = function(request) {
    const config = internals.getConfig(request);

    const routeDefaults = internals.getRouteOptions(request).defaults || {};
    const pagination = request.query[config.query.pagination.name];

    if (pagination === 'false') {
        return false;
    }

    if (pagination === 'true') {
        return true;
    }

    if (!Utils.isUndefined(routeDefaults.pagination)) {
        return routeDefaults.pagination;
    }

    return config.query.pagination.default;
};

internals.name = function(arg, config) {

    return config.meta[arg].name;
};

internals.assignIfActive = function(meta, name, value, config) {

    if (config.meta[name].active) {
        meta[internals.name(name, config)] = value;
    }
};

internals.onPreHandler = function(request, reply) {
    const config = internals.getConfig(request);

    // If the route does not match, just skip this part
    if (internals.isValidRoute(request)) {

        const routeDefaults = internals.getRouteOptions(request).defaults || {};
        const pagination = internals.getPagination(request);
        request.query[config.query.pagination.name] = pagination;

        if (pagination === false) {
            return reply.continue();
        }

        const page = routeDefaults.page || config.query.page.default;
        const limit = routeDefaults.limit || config.query.limit.default;

        const setParam = function(arg, defaultValue) {

            const name = internals.name(arg, config);
            let value = null;

            if (request.query[name] || request.query[name] === 0) {
                value = parseInt(request.query[name]);

                if (Utils.isNaN(value)) {
                    if (config.query.invalid === 'defaults') {
                        value = config.query[arg].default;
                    } else {
                        throw { message: 'Invalid ' + name };
                    }
                }
            }

            request.query[name] = value || defaultValue;
        };

        try {
            setParam('page', page);
            setParam('limit', limit);
        } catch (err) {
            return reply(Boom.badRequest(err.message));
        }
    }

    return reply.continue();
};

internals.onPreResponse = function(request, reply) {
    const config = internals.getConfig(request);

    if (internals.isValidRoute(request) &&
        !request.response.isBoom &&
        request.query[config.query.pagination.name]) {

        // Removes pagination from query parameters if default is true
        // If defaults is false, paginaton param is needed in the generated links
        if (config.query.pagination.default) {

            delete request.query[config.query.pagination.name];
        }

        const source = request.response.source;
        const results = Array.isArray(source) ? source : source[config.reply.parameters.results.name];
        Hoek.assert(Array.isArray(results), 'The results must be an array');

        const baseUri = config.uri + request.url.pathname + '?';
        const query = request.query; // Query parameters
        const currentPage = query[config.query.page.name];
        const currentLimit = query[config.query.limit.name];

        const totalCount = Utils.isUndefined(source[config.reply.parameters.totalCount.name]) ?
            request[config.meta.totalCount.name] :
            source[config.reply.parameters.totalCount.name];

        let pageCount = null;
        if (!Utils.isNil(totalCount)) {
            pageCount = Math.trunc(totalCount / currentLimit) +
                (totalCount % currentLimit === 0 ? 0 : 1);
        }

        const getUri = function(page) {

            if (!page) {
                return null;
            }

            // Override page
            const qs = Hoek.applyToDefaults(query, {
                [config.query.page.name]: page
            });

            return baseUri + Qs.stringify(qs);
        };

        const meta = {};

        internals.assignIfActive(meta, 'page', query[internals.name('page', config)], config);
        internals.assignIfActive(meta, 'limit', query[internals.name('limit', config)], config);

        internals.assignIfActive(meta, 'count', results.length, config);
        internals.assignIfActive(meta, 'pageCount', pageCount, config);
        internals.assignIfActive(meta, 'totalCount', Utils.isNil(totalCount) ? null : totalCount, config);

        const hasNext = !Utils.isNil(totalCount) && totalCount !== 0 && currentPage < pageCount;
        internals.assignIfActive(meta, 'next', hasNext ? getUri(currentPage + 1) : null, config);

        internals.assignIfActive(meta, 'self', getUri(currentPage), config);
        internals.assignIfActive(meta, 'previous', getUri(currentPage - 1), config);
        internals.assignIfActive(meta, 'first', getUri(1), config);
        internals.assignIfActive(meta, 'last', getUri(pageCount), config);

        request.response.source = {
            [config.meta.name]: meta,
            [config.results.name]: results
        };

        if (source.response) {
            const keys = Object.keys(source.response);
            keys.forEach((key) => {
                if (key !== config.meta.name &&
                    key !== config.results.name) {
                    request.response.source[key] = source.response[key];
                }
            });
        }
    }

    return reply.continue();
};

module.exports = function(config, server) {

    internals.configs[server.info.id] = config;

    return {
        onPreHandler: internals.onPreHandler,
        onPreResponse: internals.onPreResponse
    };
};
