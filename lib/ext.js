'use strict';

const _    = require('lodash');
const Boom = require('boom');
const Hoek = require('hoek');
const Qs   = require('qs');


const internals = {
    isValidRoute: function(request, config) {

        const include = config.routes.include;
        const exclude = config.routes.exclude;
        const path    = request.route.path;
        const method  = request.route.method;


        return (method === 'get' &&
               (include[0] === '*' ||  _.includes(include, path)) &&
               !_.includes(exclude, path));
    },
    getPagination: function(request, config) {
        let pagination = request.query[config.query.pagination.name];

        if (pagination === 'false') {
            pagination = false;
        } else if (pagination === 'true') {
            pagination = true;
        } else {
            pagination = config.query.pagination.default;
        }

        return pagination;
    }
};


module.exports = function(config) {
    return {
        onPreHandler: function (request, reply) {


            // If the route does not match, just skip this part
            if (internals.isValidRoute(request, config)) {

                const pagination = internals.getPagination(request, config);
                request.query[config.query.pagination.name] = pagination;

                if (pagination === false) {
                    return reply.continue();
                }


                let page = config.query.page.default;
                let limit = config.query.limit.default;

                const checkRoute = v => {
                    let match = _.includes(v.routes, request.route.path);
                    if (match) {
                        page = v.page;
                        limit = v.limit;
                    }

                    return !match;
                };

                _.every(config.routes.override, checkRoute);


                if (_.has(request.query, config.query.page.name)) {
                    const temp = _.parseInt(request.query[config.query.page.name]);
                    if (_.isNaN(temp)) {
                        if (config.query.invalid === 'defaults') {
                            page = config.query.page.default;
                        } else {
                            return reply(Boom.badRequest('Invalid page'));
                        }

                    } else {
                        page = temp;
                    }
                }

                if (_.has(request.query, config.query.limit.name)) {
                    const temp = _.parseInt(request.query[config.query.limit.name]);
                    if (_.isNaN(temp)) {
                        if (config.query.invalid === 'defaults') {
                            limit = config.query.limit.default;
                        } else {
                            return reply(Boom.badRequest('Invalid limit'));
                        }
                    } else {
                        limit = temp;
                    }
                }

                request.query[config.query.page.name] = page;
                request.query[config.query.limit.name] = limit;
            }

            return reply.continue();
        },




        onPreResponse: function (request, reply) {

            if (internals.isValidRoute(request, config) &&
                !request.response.isBoom &&
                request.query[config.query.pagination.name] === true) {

                // Removes pagination from query parameters
                delete request.query[config.query.pagination.name];

                const temp = request.response.source;

                const results = Array.isArray(temp) ? request.response.source : request.response.source.results;
                Hoek.assert(Array.isArray(results), 'The results must be an array');
                const totalCount = request.response.source.totalCount || request[config.meta.totalCount.name];

                const baseUrl = config.uri + request.url.pathname + '?';
                const qs = request.query;
                const qsPage = qs[config.query.page.name];

                const meta = {};

                const getPageCount = function() {
                    return Math.trunc(totalCount / qs[config.query.limit.name]) +
                         ((totalCount % qs[config.query.limit.name] === 0) ? 0 : 1);
                };

                const isActive = function(arg) {
                    return config.meta[arg].active;
                };

                const name = function(arg) {
                    return config.meta[arg].name;
                };

                if (isActive('page')) {
                    const pageName = config.query.page.name;
                    meta[pageName] = qs[pageName];
                }

                if (isActive('limit')) {
                    const limitName = config.query.limit.name;
                    meta[limitName] = qs[limitName];
                }

                if (isActive('count')) {
                    meta[name('count')] = results.length;
                }

                if (isActive('totalCount')) {
                    meta[name('totalCount')] = totalCount || null;
                }

                if (isActive('pageCount')) {
                    let pageCount = null;

                    if (totalCount) {
                        pageCount = getPageCount();
                    }

                    meta[name('pageCount')] = pageCount;
                }

                if (isActive('self')) {
                    meta[name('self')] = baseUrl + Qs.stringify(qs);
                }

                const getUrl = function(page) {
                    const override = {};
                    override[config.query.page.name] = page;

                    return baseUrl + Qs.stringify(Hoek.applyToDefaults(qs, override));
                };

                if (isActive('previous')) {
                    let url = null;
                    if (qsPage !== 1) {
                        url = getUrl(qsPage - 1);
                    }

                    meta[name('previous')] = url;
                }

                if (isActive('next')) {
                    let url = null;

                    if (totalCount) {
                        const pageCount = getPageCount();

                        if (qsPage < pageCount) {
                            url = getUrl(qsPage + 1);
                        }
                    }

                    meta[name('next')] = url;
                }

                if (isActive('first')) {
                    meta[name('first')] = getUrl(1);
                }

                if (isActive('last')) {
                    let url = null;

                    if (totalCount) {
                        url = getUrl(getPageCount());
                    }

                    meta[name('last')] = url;
                }


                request.response.source = {
                    [config.meta.name]: meta,
                    [config.results.name]: results,
                };

            }

            return reply.continue();

        }
    };
};
