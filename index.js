'use strict'

let _ = require('lodash');
let Hoek = require('hoek');
let Qs = require('qs');

let internals = {
    default: {
        query: {
            page: {
                name: 'page',
                default: 1
            },
            limit: {
                name: 'limit',
                default: 25
            }
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
    let config = Hoek.applyToDefaults(internals.default, options);

    server.ext('onPreHandler', function (request, reply) {

        let include = config.routes.include;
        let exclude = config.routes.exclude;
        let path = request.route.path;


        // If the route does not match, just skip this part
        if ((_.includes(include[0] === '*') ||
                _.includes(include, path)) &&
            !_.includes(exclude, path)) {

            let checkRoute = v => {
                let match = _.includes(v.routes, request.route.path);
                if (match) {
                    page = v.page;
                    limit = v.limit;
                }
            };

            _.every(config.routes.override, checkRoute);

            let page = config.query.page.default;
            let limit = config.query.limit.default;


            if (_.has(request.query, config.query.page.name)) {
                page = _.parseInt(request.query[config.query.page.name]);
            }

            if (_.has(request.query, config.query.limit.name)) {
                limit = _.parseInt(request.query[config.query.limit.name]);
            }

            request.query.page = page;
            request.query.limit = limit;
        }

        return reply.continue();
    });

    server.decorate('reply', 'paginate', function (results, totalCount) {
        let count = results.count;
    });

    server.ext('onPreResponse', function (request, reply) {


        let include = config.routes.include;
        let exclude = config.routes.exclude;
        let path = request.route.path;

        if ((_.includes(include[0] === '*') ||
                _.includes(include, path)) &&
            !_.includes(exclude, path)) {

            let results = request.response.source;
            let baseUrl = request.server.info.uri + request.url.pathname + '?';
            let qs = request.query;

            let meta = {}

            // TODO - Check if results.length is correct
            if (config.meta.count.active)
                meta[config.meta.count.name] = results.length;

            //    if (config.meta.totalCount.active)
            //     meta[config.meta.totalCount.name] = TODO

            if (config.meta.self.active)
                meta[config.meta.self.name] = baseUrl + Qs.stringify(qs);

            if (config.meta.previous.active) {
                let url = null;
                if (qs.page !== 1) {
                    let override = {};
                    override[config.query.page.name] = qs.page - 1;
                    let qsPrevious = Hoek.applyToDefaults(qs, override);
                    url = baseUrl + Qs.stringify(qsPrevious);
                }

                meta[config.meta.previous.active] = url;
            }


            if (config.meta.next.active) {
                let url = null;
            }

            /*

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
            */


            _.merge(meta, request.response.source);

        }

        reply.continue();

    });

    next();
};



exports.register.attributes = {
    name: require('package.json').name,
    version: require('package.json').version
};