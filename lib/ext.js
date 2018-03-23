'use strict';

const Utils = require('./utils');
const Boom = require('boom');
const Hoek = require('hoek');
const Qs = require('querystring');

module.exports = class Ext {

    constructor(config) {

        this.config = config;
    }

    getRouteOptions(request) {

        return request.route.settings.plugins.pagination || {};
    }

    containsPath(array, path) {

        return Utils.some(array, (item) => {

            return item instanceof RegExp ? item.test(path) : item === path;
        });
    }

    isValidRoute(request) {

        const include = this.config.routes.include;
        const exclude = this.config.routes.exclude;
        const options = this.getRouteOptions(request);
        const path = request.route.path;
        const method = request.route.method;

        if (!Utils.isUndefined(options.enabled)) {
            return options.enabled;
        }

        return (
            (method === 'get' || method === 'post') &&
            (include[0] === '*' || this.containsPath(include, path)) &&
            (!this.containsPath(exclude, path))
        );
    }

    getPagination(request) {

        if (this.config.query.pagination.active) {
            const pagination = request.query[this.config.query.pagination.name];

            if (pagination === 'false' || pagination === false) {
                return false;
            }

            if (pagination === 'true' || pagination === true) {
                return true;
            }
        }

        const routeDefaults = this.getRouteOptions(request).defaults || {};

        if (!Utils.isUndefined(routeDefaults.pagination)) {
            return routeDefaults.pagination;
        }

        return this.config.query.pagination.default;
    }

    name(arg) {

        return this.config.meta[arg].name;
    }

    assignIfActive(meta, name, value) {

        if (this.config.meta[name].active) {
            meta[this.name(name)] = value;
        }
    }

    onPreHandler(request, h) {

        // If the route does not match, just skip this part
        if (this.isValidRoute(request)) {

            const routeDefaults = this.getRouteOptions(request).defaults || {};
            const pagination = this.getPagination(request);
            request.query[this.config.query.pagination.name] = pagination;

            if (pagination === false) {
                return h.continue;
            }

            const page = routeDefaults.page || this.config.query.page.default;
            const limit = routeDefaults.limit || this.config.query.limit.default;

            const setParam = (arg, defaultValue) => {

                const name = this.name(arg);
                let value = null;

                if (request.query[name] || request.query[name] === 0) {
                    value = parseInt(request.query[name]);

                    if (Utils.isNaN(value)) {
                        if (this.config.query.invalid === 'defaults') {
                            value = this.config.query[arg].default;
                        }
                        else {
                            return h.response({ message: 'Invalid ' + name });
                        }
                    }
                }

                request.query[name] = value || defaultValue;
                return null;
            };

            let err = setParam('page', page);

            if (!err) {
                err = setParam('limit', limit);
            }

            if (err) {
                return Boom.badRequest(err.message);
            }
        }

        return h.continue;
    };

    onPostHandler(request, h) {

        const statusCode = request.response.statusCode;
        const processResponse =
            this.isValidRoute(request) &&
            statusCode >= 200 &&
            statusCode <= 299 &&
            this.getPagination(request);

        if (!processResponse) {
            return h.continue;
        }

        // Removes pagination from query parameters if default is true
        // If defaults is false, paginaton param is needed in the generated links
        if (this.config.query.pagination.default) {
            delete request.query[this.config.query.pagination.name];
        }

        const source = request.response.source;
        const results = Array.isArray(source) ? source : source[this.config.reply.parameters.results.name];
        Hoek.assert(Array.isArray(results), 'The results must be an array');

        const baseUri = this.config.uri + request.url.pathname + '?';
        const query = request.query; // Query parameters
        const currentPage = query[this.config.query.page.name];
        const currentLimit = query[this.config.query.limit.name];

        const totalCount = Utils.isUndefined(source[this.config.reply.parameters.totalCount.name])
            ? Utils.isUndefined(request.response.headers['total-count'])
                ? request[this.config.meta.totalCount.name]
                : request.response.headers['total-count']
            : source[this.config.reply.parameters.totalCount.name];

        let pageCount = null;
        if (!Utils.isNil(totalCount)) {
            pageCount =
                Math.trunc(totalCount / currentLimit) + (totalCount % currentLimit === 0 ? 0 : 1);
        }

        const getUri = (page) => {

            if (!page) {
                return null;
            }

            const origQuery = Object.assign({}, query, request.orig.query);

            // Override page
            const qs = Hoek.applyToDefaults(origQuery, {
                [this.config.query.page.name]: page
            });

            return baseUri + Qs.stringify(qs);
        };

        const meta = {};
        const hasNext = !Utils.isNil(totalCount) && totalCount !== 0 && currentPage < pageCount;
        const hasPrevious = !Utils.isNil(totalCount) && totalCount !== 0 && currentPage > 1;

        if (this.config.meta.location === 'header') {
            delete request.response.headers['total-count'];

            if (totalCount > currentLimit && results.length > 0) {
                // put metadata in headers rather than in body
                const startIndex = currentLimit * (currentPage - 1);
                const endIndex = startIndex + results.length - 1;

                const links = [];
                links.push('<' + getUri(currentPage) + '>; rel="self"');
                links.push('<' + getUri(1) + '>; rel="first"');
                links.push('<' + getUri(pageCount) + '>; rel="last"');

                if (hasNext) {
                    links.push('<' + getUri(currentPage + 1) + '>; rel="next"');
                }

                if (hasPrevious) {
                    links.push('<' + getUri(currentPage - 1) + '>; rel="prev"');
                }

                request.response.headers['Content-Range'] = startIndex + '-' + endIndex + '/' + totalCount;
                request.response.headers.Link = links;

                if (this.config.meta.successStatusCode) {
                    request.response.code(this.config.meta.successStatusCode);
                }
            }

            request.response.source = results;
        }
        else {
            this.assignIfActive(meta, 'page', query[this.name('page')]);
            this.assignIfActive(meta, 'limit', query[this.name('limit')]);

            this.assignIfActive(meta, 'count', results.length);
            this.assignIfActive(meta, 'pageCount', pageCount);
            this.assignIfActive(meta, 'totalCount', Utils.isNil(totalCount) ? null : totalCount);

            this.assignIfActive(meta, 'next', hasNext ? getUri(currentPage + 1) : null);
            this.assignIfActive(meta, 'previous', getUri(currentPage - 1));
            this.assignIfActive(meta, 'hasNext', hasNext);
            this.assignIfActive(meta, 'hasPrevious', hasPrevious);

            this.assignIfActive(meta, 'self', getUri(currentPage));
            this.assignIfActive(meta, 'first', getUri(1));
            this.assignIfActive(meta, 'last', getUri(pageCount));


            const response = {
                [this.config.meta.name]: meta,
                [this.config.results.name]: results
            };

            if (source.response) {
                const keys = Object.keys(source.response);

                for (let i = 0; i < keys.length; ++i) {
                    const key = keys[i];
                    if (key !== this.config.meta.name &&
                        key !== this.config.results.name) {
                        response[key] = source.response[key];
                    }
                }
            }

            if (this.config.meta.successStatusCode) {
                return h.response(response).code(this.config.meta.successStatusCode);
            }

            return h.response(response);
        }

        return h.continue;
    }
};
