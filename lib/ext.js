'use strict';

const _    = require('lodash');
const Boom = require('boom');
const Hoek = require('hoek');
const Qs   = require('qs');

const internals = {
    isUndefined: (value) => (typeof value === 'undefined'),


    getRouteOptions: (request) => request.route.settings.plugins.pagination || {},


    containsPath: function (array, path) {

        return _.some(array, (item) => {

            return item instanceof RegExp ? item.test(path) : item === path;
        });
    },


    isValidRoute: function (request) {

        const include = internals.config.routes.include;
        const exclude = internals.config.routes.exclude;
        const path    = request.route.path;
        const method  = request.route.method;
        const options = internals.getRouteOptions(request);


        if (!internals.isUndefined(options.enabled)) {
            return options.enabled;
        }

        return (method === 'get' &&
               (include[0] === '*' || internals.containsPath(include, path)) &&
               !internals.containsPath(exclude, path));
    },


    getPagination: function (request, config) {

        const routeDefaults = internals.getRouteOptions(request).defaults || {};
        let pagination = request.query[config.query.pagination.name];

        if (pagination === 'false') {
            pagination = false;
        }
        else if (pagination === 'true') {
            pagination = true;
        }
        else if (!internals.isUndefined(routeDefaults.pagination)) {
            pagination = routeDefaults.pagination;
        }
        else {
            pagination = config.query.pagination.default;
        }

        return pagination;
    },


    name: (arg) => internals.config.meta[arg].name,


    assignIfActive: function (meta, name, value) {

        if (internals.config.meta[name].active) {
            meta[internals.name(name)] = value;
        }
    }
};




module.exports = function (config) {

    internals.config = config;

    return {
        onPreHandler: function (request, reply) {

            // If the route does not match, just skip this part
            if (internals.isValidRoute(request)) {

                const routeDefaults = internals.getRouteOptions(request).defaults || {};
                const pagination = internals.getPagination(request, config);
                request.query[config.query.pagination.name] = pagination;

                if (pagination === false) {
                    return reply.continue();
                }

                const page = routeDefaults.page || config.query.page.default;
                const limit = routeDefaults.limit || config.query.limit.default;

                const setParam = function (arg, defaultValue) {

                    const name = internals.name(arg);
                    let value = null;

                    if (_.has(request.query, name)) {
                        value = _.parseInt(request.query[name]);

                        if (_.isNaN(value)) {
                            if (config.query.invalid === 'defaults') {
                                value = config.query[arg].default;
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
        },


        onPreResponse: function (request, reply) {

            if (internals.isValidRoute(request) &&
                !request.response.isBoom &&
                request.query[config.query.pagination.name]) {

                // Removes pagination from query parameters if default is true
                // If defaults is false, paginaton param is needed in the generated links
                if (config.query.pagination.default) {
                    delete request.query[config.query.pagination.name];
                }

                const source = request.response.source;
                const results = Array.isArray(source) ? source : source.results;
                Hoek.assert(Array.isArray(results), 'The results must be an array');

                let totalCount = source.totalCount;

                // source.totalCount || request[config.meta.totalCount.name] does
                // not work because of 0
                if (internals.isUndefined(totalCount)) {
                    totalCount = request[config.meta.totalCount.name];
                }

                const baseUri = config.uri + request.url.pathname + '?';
                const qs = request.query; // Query parameters
                const currentPage  = qs[config.query.page.name];
                const currentLimit = qs[config.query.limit.name];

                const getPageCount = function () {

                    if (internals.isUndefined(totalCount)) {
                        return null;
                    }

                    if (totalCount === 0) {
                        return 0;
                    }

                    return Math.trunc(totalCount / currentLimit) +
                         ((totalCount % currentLimit === 0) ? 0 : 1);
                };

                const getUri = function (page) {

                    if (!page) {
                        return null;
                    }

                    const override = {
                        [config.query.page.name]: page
                    };

                    return baseUri + Qs.stringify(Hoek.applyToDefaults(qs, override));
                };

                const meta = {};
                internals.assignIfActive(meta, 'page', qs[internals.name('page')]);
                internals.assignIfActive(meta, 'limit', qs[internals.name('limit')]);
                internals.assignIfActive(meta, 'count', results.length);

                internals.assignIfActive(meta, 'totalCount', internals.isUndefined(totalCount) ? null : totalCount);
                internals.assignIfActive(meta, 'pageCount', getPageCount());
                internals.assignIfActive(meta, 'self', baseUri + Qs.stringify(qs));
                internals.assignIfActive(meta, 'previous', currentPage !== 1 ? getUri(currentPage - 1) : null);

                const hasNext = totalCount && currentPage < getPageCount();
                internals.assignIfActive(meta, 'next', hasNext ? getUri(currentPage + 1) : null);
                internals.assignIfActive(meta, 'first', getUri(1));
                internals.assignIfActive(meta, 'last', getUri(getPageCount()));

                request.response.source = {
                    [config.meta.name]: meta,
                    [config.results.name]: results
                };

            }

            return reply.continue();

        }
    };
};
