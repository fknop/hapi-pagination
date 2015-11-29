'use strict';

const _    = require('lodash');
const Hoek = require('hoek');
const Qs   = require('qs');
const Boom = require('boom');

const internals = {
    defaults: {
        query: {
            page: {
                name: 'page',
                default: 1
            },
            limit: {
                name: 'limit',
                default: 25
            },
            pagination: {
                name: 'pagination',
                default: true
            },
            invalid: 'defaults'
        },
        meta: {
            name: 'meta',
            count: {
                active: true,
                name: 'count'
            },
            totalCount: {
                active: true,
                name: 'totalCount'
            },
            pageCount: {
                active: true,
                name: 'pageCount'
            },
            self: {
                active: true,
                name: 'self'
            },
            previous: {
                active: true,
                name: 'previous'
            },
            next: {
                active: true,
                name: 'next'
            },
            first: {
                active: true,
                name: 'first'
            },
            last: {
                active: true,
                name: 'last'
            },

            // name == default.query.page.name
            page: {
                active: false,
            },
            // name == default.query.limit.name
            limit: {
                active: false
            }

        },
        results: {
            name: 'results'
        },
        reply: {
            paginate: 'paginate'
        },
        routes: {
            include: ['*'],
            exclude: [],
            override: [{
                routes: [],
                limit: 25,
                page: 1
            }]
        }
    }
};


exports.register = function (server, options, next) {


    Hoek.assert(server.connections.length === 1,
                'You cannot register this plugin for two connections at once. ' +
                'Register it for each connection on your server.');

    internals.uri = server.info.uri


    const config = Hoek.applyToDefaults(internals.defaults, options);

    Hoek.assert(config.query.invalid === 'defaults' || config.query.invalid === 'badRequest',
                'options.query.invalid can only be: \'defaults\' or \'badRequest\' ');

    server.decorate('reply', config.reply.paginate, function(results, totalCount) {
        Hoek.assert(Array.isArray(results), '#reply.' + config.reply.paginate + ' results must be an array.');

        return this.response({ results: results, totalCount: totalCount });
    });

    server.ext('onPreHandler', function (request, reply) {

        const include = config.routes.include;
        const exclude = config.routes.exclude;
        const path = request.route.path;

        let pagination = request.query[config.query.pagination.name];

        if (typeof pagination === 'undefined') {
            pagination = config.query.pagination.default;
        } else if (pagination === 'false') {
            pagination = false;
        } else if (pagination === 'true') {
            pagination = true;
        }

        request.query[config.query.pagination.name] = pagination;

        if (pagination === false) {
            return reply.continue();
        }

        // If the route does not match, just skip this part
        if (request.route.method === 'get' && (include[0] === '*' || _.includes(include, path)) &&
            !_.includes(exclude, path)) {

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
    });


    /**
     * totalCount must be exposed to the request object if you wants
     * the links to works properly.
     * request.totalCount = totalCount;
     * where totalCount == config.meta.totalCount.name
     * If totalCount is not exposed through the request object, the following
     * metadata will be null :
     * - last link
     * - next link
     * - totalCount
     * - pageCount
     */
    server.ext('onPreResponse', function (request, reply) {

        if (request.response.isBoom || request.route.method !== 'get') {
            return reply.continue();
        }

        if (request.query[config.query.pagination.name] === false) {
            return reply.continue();
        } else {
            delete request.query[config.query.pagination.name];
        }

        const include = config.routes.include;
        const exclude = config.routes.exclude;
        const path = request.route.path;


        if ((include[0] === '*' || _.includes(include, path)) &&
            !_.includes(exclude, path)) {

            const temp = request.response.source;

            const results = Array.isArray(temp) ? request.response.source : request.response.source.results;
            Hoek.assert(Array.isArray(results), 'The results must be an array');
            const totalCount = request.response.source.totalCount || request[config.meta.totalCount.name];

            const baseUrl = internals.uri + request.url.pathname + '?';
            const qs = request.query;
            const qsPage = qs[config.query.page.name];



            const meta = {};

            const getPageCount = function() {
                return Math.trunc(totalCount / qs[config.query.limit.name]) +
                     ((totalCount % qs[config.query.limit.name] === 0) ? 0 : 1);
            };

            if (config.meta.page.active) {
                meta[config.query.page.name] = qs[config.query.page.name];
            }

            if (config.meta.limit.active) {
                meta[config.query.limit.name] = qs[config.query.limit.name];
            }

            if (config.meta.count.active) {
                meta[config.meta.count.name] = results.length;
            }

            if (config.meta.totalCount.active) {
                meta[config.meta.totalCount.name] = totalCount || null;
            }

            if (config.meta.pageCount.active) {
                let pageCount = null;

                if (totalCount) {
                    pageCount = getPageCount();
                }

                meta[config.meta.pageCount.name] = pageCount;
            }

            if (config.meta.self.active) {
                meta[config.meta.self.name] = baseUrl + Qs.stringify(qs);
            }

            const getUrl = function(page) {
                const override = {};
                override[config.query.page.name] = page;

                return baseUrl + Qs.stringify(Hoek.applyToDefaults(qs, override));
            };

            if (config.meta.previous.active) {
                let url = null;
                if (qsPage !== 1) {
                    url = getUrl(qsPage - 1);
                }

                meta[config.meta.previous.name] = url;
            }

            if (config.meta.next.active) {
                let url = null;

                if (totalCount) {
                    const pageCount = getPageCount();

                    if (qsPage < pageCount) {
                        url = getUrl(qsPage + 1);
                    }
                }

                meta[config.meta.next.name] = url;
            }

            if (config.meta.first.active) {
                meta[config.meta.first.name] = getUrl(1);
            }

            if (config.meta.last.active) {
                let url = null;

                if (totalCount) {
                    url = getUrl(getPageCount());
                }

                meta[config.meta.last.name] = url;
            }


            const response = {};
            response[config.meta.name] = meta;
            response[config.results.name] = results;
            request.response.source = response;

        }

        return reply.continue();

    });

    next();
};



exports.register.attributes = {
    name: require('./package.json').name,
    version: require('./package.json').version
};
