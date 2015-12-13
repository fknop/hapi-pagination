'use strict';

const Hoek = require('hoek');

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
    TypeError: function(arg) {
        return new TypeError(arg);
    },
    checkConfig: function(config) {

        Hoek.assert(config.query.invalid === 'defaults' || config.query.invalid === 'badRequest',
                'options.query.invalid can only be: \'defaults\' or \'badRequest\' ');

        Hoek.assert(this.isNumber(config.query.page.default), this.TypeError('Page must be a number'));
        Hoek.assert(this.isNumber(config.query.limit.default), this.TypeError('Limit must be a number'));
        Hoek.assert(this.isBoolean(config.query.pagination.default), this.TypeError('Pagination must be a boolean'));

        Hoek.assert(this.isString(config.query.page.name), this.TypeError('Page name must be a string'));
        Hoek.assert(this.isString(config.query.limit.name), this.TypeError('Limit name must be a string'));
        Hoek.assert(this.isString(config.query.pagination.name), this.TypeError('Pagination name must be a string'));

        Hoek.assert(this.isString(config.meta.name), this.TypeError('Meta object name must be a string'));

        Hoek.assert(this.isBoolean(config.meta.count.active), this.TypeError('count active must be a boolean'));
        Hoek.assert(this.isString(config.meta.count.name), this.TypeError('count name must be a string'));

        Hoek.assert(this.isBoolean(config.meta.totalCount.active), this.TypeError('totalCount active must be a boolean'));
        Hoek.assert(this.isString(config.meta.totalCount.name), this.TypeError('totalCount name must be a string'));

        Hoek.assert(this.isBoolean(config.meta.pageCount.active), this.TypeError('pageCount active must be a boolean'));
        Hoek.assert(this.isString(config.meta.pageCount.name), this.TypeError('pageCount name must be a string'));

        Hoek.assert(this.isBoolean(config.meta.self.active), this.TypeError('self active must be a boolean'));
        Hoek.assert(this.isString(config.meta.self.name), this.TypeError('self name must be a string'));

        Hoek.assert(this.isBoolean(config.meta.first.active), this.TypeError('first active must be a boolean'));
        Hoek.assert(this.isString(config.meta.first.name), this.TypeError('first name must be a string'));

        Hoek.assert(this.isBoolean(config.meta.last.active), this.TypeError('last active must be a boolean'));
        Hoek.assert(this.isString(config.meta.last.name), this.TypeError('last name must be a string'));

        Hoek.assert(this.isBoolean(config.meta.previous.active), this.TypeError('previous active must be a boolean'));
        Hoek.assert(this.isString(config.meta.previous.name), this.TypeError('previous name must be a string'));

        Hoek.assert(this.isBoolean(config.meta.next.active), this.TypeError('next active must be a boolean'));
        Hoek.assert(this.isString(config.meta.next.name), this.TypeError('next name must be a string'));

        Hoek.assert(this.isBoolean(config.meta.page.active), this.TypeError('page active must be a boolean'));
        Hoek.assert(this.isString(config.meta.page.name), this.TypeError('page name must be a string'));

        Hoek.assert(this.isBoolean(config.meta.limit.active), this.TypeError('limit active must be a boolean'));
        Hoek.assert(this.isString(config.meta.limit.name), this.TypeError('limit name must be a string'));


    }
};

module.exports = {
    getConfig: function(options) {
        const config = Hoek.applyToDefaults(internals.defaults, options);
        internals.checkConfig(config);
        return config;
    }
};
