'use strict';

const Utils = require('./utils');
const Boom = require('boom');
const Hoek = require('hoek');
const Qs   = require('querystring');

const internals = {};


internals.getRouteOptions = function (request) {

    return request.route.settings.plugins.pagination || {};
};


internals.containsPath = function (array, path) {

    return Utils.some(array, (item) => {

        return item instanceof RegExp ? item.test(path) : item === path;
    });
},


internals.isValidRoute = function (request) {

    const include = internals.config.routes.include;
    const exclude = internals.config.routes.exclude;
    const options = internals.getRouteOptions(request);
    const path    = request.route.path;
    const method  = request.route.method;

    if (!Utils.isUndefined(options.enabled)) {
        return options.enabled;
    }

    return (
        (method === 'get') &&
        (include[0] === '*' || internals.containsPath(include, path)) &&
        (!internals.containsPath(exclude, path))
    );
};


internals.getPagination = function (request, config) {

    const routeDefaults = internals.getRouteOptions(request).defaults || {};
    const pagination = request.query[config.query.pagination.name];

    if (pagination === 'false' || pagination === false) {
        return false;
    }

    if (pagination === 'true' || pagination === true) {
        return true;
    }

    if (!Utils.isUndefined(routeDefaults.pagination)) {
        return routeDefaults.pagination;
    }

    return config.query.pagination.default;
};


internals.name = function (arg) {

    return internals.config.meta[arg].name;
};


internals.assignIfActive = function (meta, name, value) {

    if (internals.config.meta[name].active) {
        meta[internals.name(name)] = value;
    }
};

internals.onPreHandler = function (request, reply) {

    // If the route does not match, just skip this part
    if (internals.isValidRoute(request)) {

        const routeDefaults = internals.getRouteOptions(request).defaults || {};
        const pagination = internals.getPagination(request, internals.config);
        request.query[internals.config.query.pagination.name] = pagination;

        if (pagination === false) {
            return reply.continue();
        }

        const page  = routeDefaults.page  || internals.config.query.page.default;
        const limit = routeDefaults.limit || internals.config.query.limit.default;

        const setParam = function (arg, defaultValue) {

            const name = internals.name(arg);
            let value = null;

            if (request.query[name] || request.query[name] === 0) {
                value = parseInt(request.query[name]);

                if (Utils.isNaN(value)) {
                    if (internals.config.query.invalid === 'defaults') {
                        value = internals.config.query[arg].default;
                    }
                    else {
                        throw { message: 'Invalid ' + name };
                    }
                }
            }

            request.query[name] = value || defaultValue;
        };

        try {
            setParam('page', page);
            setParam('limit', limit);
        }
        catch (err) {
            return reply(Boom.badRequest(err.message));
        }
    }

    return reply.continue();
};

internals.onPreResponse = function (request, reply) {
    if (internals.isValidRoute(request) &&
        !request.response.isBoom &&
        internals.getPagination(request, internals.config) ){

        // Removes pagination from query parameters if default is true
        // If defaults is false, paginaton param is needed in the generated links
        if (internals.config.query.pagination.default) {
            delete request.query[internals.config.query.pagination.name];
        }

        const source = request.response.source;
        const results = Array.isArray(source) ? source : source[internals.config.reply.parameters.results.name];
        Hoek.assert(Array.isArray(results), 'The results must be an array');

        const baseUri = internals.config.uri + request.url.pathname + '?';
        const query = request.query; // Query parameters
        const currentPage  = query[internals.config.query.page.name];
        const currentLimit = query[internals.config.query.limit.name];

        const totalCount = Utils.isUndefined(source[internals.config.reply.parameters.totalCount.name]) ?
                           request[internals.config.meta.totalCount.name] :
                           source[internals.config.reply.parameters.totalCount.name];

        let pageCount = null;
        if (!Utils.isNil(totalCount)) {
            pageCount = Math.trunc(totalCount / currentLimit) +
                        (totalCount % currentLimit === 0 ? 0 : 1);
        }

        const getUri = function (page) {


            if (!page) {
                return null;
            }

            // Override page
            const qs = Hoek.applyToDefaults(query, {
                [internals.config.query.page.name]: page
            });

            return baseUri + Qs.stringify(qs);
        };

        const meta = {};

        internals.assignIfActive(meta, 'page', query[internals.name('page')]);
        internals.assignIfActive(meta, 'limit', query[internals.name('limit')]);

        internals.assignIfActive(meta, 'count', results.length);
        internals.assignIfActive(meta, 'pageCount', pageCount);
        internals.assignIfActive(meta, 'totalCount', Utils.isNil(totalCount) ? null : totalCount);

        const hasNext = !Utils.isNil(totalCount) && totalCount !== 0 && currentPage < pageCount;
        internals.assignIfActive(meta, 'next', hasNext ? getUri(currentPage + 1) : null);

        internals.assignIfActive(meta, 'self',     getUri(currentPage));
        internals.assignIfActive(meta, 'previous', getUri(currentPage - 1));
        internals.assignIfActive(meta, 'first',    getUri(1));
        internals.assignIfActive(meta, 'last',     getUri(pageCount));

        request.response.source = {
            [internals.config.meta.name]: meta,
            [internals.config.results.name]: results
        };

        if (source.response) {
            const keys = Object.keys(source.response);
            keys.forEach((key) => {
                if (key !== internals.config.meta.name &&
                    key !== internals.config.results.name) {
                        request.response.source[key] = source.response[key];
                    }
            });
        }
    }

    return reply.continue();
};


module.exports = function (config) {

    internals.config = config;

    return {
        onPreHandler: internals.onPreHandler,
        onPreResponse: internals.onPreResponse
    };
};


