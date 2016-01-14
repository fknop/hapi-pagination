'use strict';

const Hoek = require('hoek');
const Joi  = require('joi');
const _    = require('lodash');

const internals = {
    defaults: require('./defaults'),
    schemas: {}
};


internals.schemas.metaParameter = Joi.object({
    active: Joi.boolean().required(),
    name: Joi.string().required()
});


internals.schemas.options = Joi.object({
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
        count: internals.schemas.metaParameter,
        totalCount: internals.schemas.metaParameter,
        pageCount: internals.schemas.metaParameter,
        self: internals.schemas.metaParameter,
        previous: internals.schemas.metaParameter,
        next: internals.schemas.metaParameter,
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
        paginate: Joi.string().required()
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


module.exports = {
    getConfig: function (server, options) {

        const config = Hoek.applyToDefaults(internals.defaults, options);
        const routeSettings = _.map(server.table()[0].table, (item) => item.settings);

        // Check main config
        const result = Joi.validate(config, internals.schemas.options);
        if (result.error) {
            throw result.error;
        }

        // Check each route settings if config is valid
        _.forEach(routeSettings, (setting) => {

            const res = Joi.validate(setting.plugins.pagination, internals.schemas.routeOptions);
            if (res.error) {
                throw res.error;
            }
        });

        return result.value;
    }
};
