'use strict';

const Hoek = require('hoek');
const Joi = require('joi');
const Utils = require('./utils');

const internals = {
    defaults: require('./defaults'),
    schemas: {}
};


internals.schemas.metaParameter = Joi.object({
    active: Joi.boolean().required(),
    name: Joi.string().required()
});

internals.schemas.replyParameter = Joi.object({
    name: Joi.string().required()
});


internals.schemas.options = Joi.object({
    query: Joi.object({
        page: Joi.object({
            name: Joi.string().required(),
            default: Joi.number().integer().required()
        }),
        limit: Joi.object({
            name: Joi.string().required(),
            default: Joi.number().integer().positive().required()
        }),
        pagination: Joi.object({
            name: Joi.string().required(),
            default: Joi.boolean().required(),
            active: Joi.boolean().required()
        }),
        invalid: Joi.string().required()
    }),
    meta: Joi.object({
        location: Joi.string().valid('body', 'header'),
        successStatusCode: Joi.number().integer().min(200).less(300),
        baseUri: Joi.string().allow(''),
        name: Joi.string().required(),
        count: internals.schemas.metaParameter,
        totalCount: internals.schemas.metaParameter,
        pageCount: internals.schemas.metaParameter,
        self: internals.schemas.metaParameter,
        previous: internals.schemas.metaParameter,
        next: internals.schemas.metaParameter,
        hasNext: internals.schemas.metaParameter,
        hasPrevious: internals.schemas.metaParameter,
        first: internals.schemas.metaParameter,
        last: internals.schemas.metaParameter,
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
        paginate: Joi.string().required(),
        parameters: {
            results: internals.schemas.replyParameter,
            totalCount: internals.schemas.replyParameter
        }
    }),
    routes: Joi.object({
        include: Joi.array().items(Joi.alternatives().try(Joi.object().type(RegExp), Joi.string())), // May register no routes...
        exclude: Joi.array().items(Joi.alternatives().try(Joi.object().type(RegExp), Joi.string()))
    })
});


internals.schemas.routeOptions = Joi.object({
    enabled: Joi.boolean(),
    defaults: Joi.object({
        page: Joi.number().integer().positive(),
        limit: Joi.number().integer().positive(),
        pagination: Joi.boolean()
    })
});

const getConfig = function (server, options) {

    const config = Hoek.applyToDefaults(internals.defaults, options);
    const routeSettings = Utils.map(server.table(), (item) => item.settings);

    // Check main config
    const result = Joi.validate(config, internals.schemas.options);
    if (result.error) {
        return { error: result.error, config: null };
    }


    // Check each route settings if config is valid
    for (let i = 0; i < routeSettings.length; ++i) {
        const res = Joi.validate(routeSettings[i].plugins.pagination, internals.schemas.routeOptions);
        if (res.error) {
            return { error: res.error, config: null };
        }
    }

    return { error: null, config: result.value };
};

module.exports = {
    getConfig
};
