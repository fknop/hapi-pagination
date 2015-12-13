'use strict';

const Hoek = require('hoek');
const _    = require('lodash');

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
    },
    isString: function(arg) {
        return (typeof arg === 'string');
    },
    isNumber: function(arg) {
        return (typeof arg === 'number');
    },
    isBoolean: function(arg) {
        return (typeof arg === 'boolean');
    },
    check: function(predicate, message) {
        Hoek.assert(predicate, new TypeError(message));
    },
    checkConfig: function(config) {

        this.check(config.query.invalid === 'defaults' || config.query.invalid === 'badRequest',
                'options.query.invalid can only be: \'defaults\' or \'badRequest\' ');

        this.check(this.isNumber(config.query.page.default), 'Page must be a number');
        this.check(this.isNumber(config.query.limit.default), 'Limit must be a number');
        this.check(this.isBoolean(config.query.pagination.default), 'Pagination must be a boolean');

        this.check(this.isString(config.query.page.name), 'Page name must be a string');
        this.check(this.isString(config.query.limit.name), 'Limit name must be a string');
        this.check(this.isString(config.query.pagination.name), 'Pagination name must be a string');

        this.check(this.isString(config.meta.name), 'Meta object name must be a string');

        this.check(this.isBoolean(config.meta.count.active), 'count active must be a boolean');
        this.check(this.isString(config.meta.count.name), 'count name must be a string');

        this.check(this.isBoolean(config.meta.totalCount.active), 'totalCount active must be a boolean');
        this.check(this.isString(config.meta.totalCount.name), 'totalCount name must be a string');

        this.check(this.isBoolean(config.meta.pageCount.active), 'pageCount active must be a boolean');
        this.check(this.isString(config.meta.pageCount.name), 'pageCount name must be a string');

        this.check(this.isBoolean(config.meta.self.active), 'self active must be a boolean');
        this.check(this.isString(config.meta.self.name), 'self name must be a string');

        this.check(this.isBoolean(config.meta.first.active), 'first active must be a boolean');
        this.check(this.isString(config.meta.first.name), 'first name must be a string');

        this.check(this.isBoolean(config.meta.last.active), 'last active must be a boolean');
        this.check(this.isString(config.meta.last.name), 'last name must be a string');

        this.check(this.isBoolean(config.meta.previous.active), 'previous active must be a boolean');
        this.check(this.isString(config.meta.previous.name), 'previous name must be a string');

        this.check(this.isBoolean(config.meta.next.active), 'next active must be a boolean');
        this.check(this.isString(config.meta.next.name), 'next name must be a string');

        this.check(this.isBoolean(config.meta.page.active), 'page active must be a boolean');
        this.check(this.isBoolean(config.meta.limit.active), 'limit active must be a boolean');

        this.check(this.isString(config.results.name), 'results name must be a string');
        this.check(this.isString(config.reply.paginate), 'reply.paginate must be a string');



        const routes = config.routes;

        _.each(routes.include, r => this.check(this.isString(r),
                                    'routes (include) must be an array of strings only'));

        _.each(routes.exclude, r => this.check(this.isString(r),
                                    'routes (exclude) must be an array of strings only'));


        _.each(routes.override, r => {

            _.each(r.routes, r => this.check(this.isString(r), 'routes must be an array of strings only'));

            this.check(this.isNumber(r.limit), 'limit must be a number');
            this.check(this.isNumber(r.page), 'page must be a number');
        });

    }
};

module.exports = {
    getConfig: function(options) {
        const config = Hoek.applyToDefaults(internals.defaults, options);
        internals.checkConfig(config);
        return config;
    }
};
