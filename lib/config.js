'use strict';

const Hoek = require('hoek');
const Joi  = require('joi');

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
            baseUri: '',            
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
                active: false
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

internals.metaParameter = Joi.object({
    active: Joi.boolean().required(),
    name: Joi.string().required()
});

internals.schema = Joi.object({
    query: Joi.object({
        page: Joi.object({
            name: Joi.string().required(),
            default: Joi.number().integer().positive().required()
        }),
        limit: Joi.object({
            name: Joi.string().required(),
            default: Joi.number().integer().positive().required()
        }),
        pagination: Joi.object({
            name: Joi.string().required(),
            default: Joi.boolean().required()
        }),
        invalid: Joi.string().required()
    }),
    meta: Joi.object({
        baseUri: Joi.string().allow(''),
        name: Joi.string().required(),
        count: internals.metaParameter,
        totalCount: internals.metaParameter,
        pageCount: internals.metaParameter,
        self: internals.metaParameter,
        previous: internals.metaParameter,
        next: internals.metaParameter,
        first: internals.metaParameter,
        last: internals.metaParameter,
        page: Joi.object({
            active: Joi.boolean().required()
        }),
        limit: Joi.object({
            active: Joi.boolean().required()
        })
    }),
    results: Joi.object({
        name: Joi.string().required()
    }),
    reply: Joi.object({
        paginate: Joi.string().required()
    }),
    routes: Joi.object({
        include: Joi.array().items(Joi.string()), // May register no routes...
        exclude: Joi.array().items(Joi.string()),
        override: Joi.array().items(Joi.object({
            routes: Joi.array().items(Joi.string()),
            limit: Joi.number().integer(),
            page: Joi.number().integer()
        }))

    })
});

module.exports = {
    getConfig: function (options) {

        const config = Hoek.applyToDefaults(internals.defaults, options);
        return Joi.validate(config, internals.schema);
    }
};
