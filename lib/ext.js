'use strict';

const Utils = require('./utils');
const Boom = require('boom');
const Hoek = require('hoek');
const Qs = require('querystring');

const internals = {};

internals.getRouteOptions = function (request) {

  return request.route.settings.plugins.pagination || {};
};


internals.containsPath = function (array, path) {

  return Utils.some(array, (item) => {
    return item instanceof RegExp ? item.test(path) : item === path;
  });
},


internals.isValidRoute = function (request) {

  const include = internals.config.routes.include;
  const exclude = internals.config.routes.exclude;
  const options = internals.getRouteOptions(request);
  const path    = request.route.path;
  const method  = request.route.method;

  if (!Utils.isUndefined(options.enabled)) {
      return options.enabled;
  }

  return (
    (method === 'get') &&
    (include[0] === '*' || internals.containsPath(include, path)) &&
    (!internals.containsPath(exclude, path))
  );
};


internals.getPagination = function (request, config) {
  if (config.query.pagination.active) {
    const pagination = request.query[config.query.pagination.name];

    if (pagination === 'false' || pagination === false) {
      return false;
    }

    if (pagination === 'true' || pagination === true) {
      return true;
    }
  }

  const routeDefaults = internals.getRouteOptions(request).defaults || {};

  if (!Utils.isUndefined(routeDefaults.pagination)) {
    return routeDefaults.pagination;
  }

  return config.query.pagination.default;
};


internals.name = function (arg) {

  return internals.config.meta[arg].name;
};


internals.assignIfActive = function (meta, name, value) {

  if (internals.config.meta[name].active) {
      meta[internals.name(name)] = value;
  }
};

internals.onPreHandler = function (request, reply) {

  // If the route does not match, just skip this part
  if (internals.isValidRoute(request)) {

    const routeDefaults = internals.getRouteOptions(request).defaults || {};
    const pagination = internals.getPagination(request, internals.config);
    request.query[internals.config.query.pagination.name] = pagination;

    if (pagination === false) {
      return reply.continue();
    }

    const page  = routeDefaults.page  || internals.config.query.page.default;
    const limit = routeDefaults.limit || internals.config.query.limit.default;

    const setParam = function (arg, defaultValue) {

      const name = internals.name(arg);
      let value = null;

      if (request.query[name] || request.query[name] === 0) {
        value = parseInt(request.query[name]);

        if (Utils.isNaN(value)) {
          if (internals.config.query.invalid === 'defaults') {
            value = internals.config.query[arg].default;
          }
          else {
            return { message: 'Invalid ' + name };
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
      return reply(Boom.badRequest(err.message));
    }
  }

  return reply.continue();
};

internals.onPostHandler = function (request, reply) {

  const processResponse =
      internals.isValidRoute(request) &&
      internals.getPagination(request, internals.config);

  if (!processResponse) {
    return reply.continue();
  }

  // Removes pagination from query parameters if default is true
  // If defaults is false, paginaton param is needed in the generated links
  if (internals.config.query.pagination.default) {
    delete request.query[internals.config.query.pagination.name];
  }

  const source = request.response.source;
  const results = Array.isArray(source) ? source : source[internals.config.reply.parameters.results.name];
  Hoek.assert(Array.isArray(results), 'The results must be an array');

  const baseUri = internals.config.uri + request.url.pathname + '?';
  const query = request.query; // Query parameters
  const currentPage  = query[internals.config.query.page.name];
  const currentLimit = query[internals.config.query.limit.name];

  const totalCount = Utils.isUndefined(source[internals.config.reply.parameters.totalCount.name])
                      ? Utils.isUndefined(request.response.headers['total-count'])
                        ? request[internals.config.meta.totalCount.name]
                        : request.response.headers['total-count']
                      : source[internals.config.reply.parameters.totalCount.name];

  let pageCount = null;
  if (!Utils.isNil(totalCount)) {
    pageCount =
      Math.trunc(totalCount / currentLimit) + (totalCount % currentLimit === 0 ? 0 : 1);
  }

  const getUri = function (page) {

    if (!page) {
      return null;
    }

    // Override page
    const qs = Hoek.applyToDefaults(query, {
      [internals.config.query.page.name]: page
    });

    return baseUri + Qs.stringify(qs);
  };

  const meta = {};
  const hasNext = !Utils.isNil(totalCount) && totalCount !== 0 && currentPage < pageCount;
  const hasPrevious = !Utils.isNil(totalCount) && totalCount !== 0 && currentPage > 1;

  if (internals.config.meta.location === 'header') {
    delete request.response.headers['total-count']

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
      request.response.headers['Link'] = links;

      if (internals.config.meta.successStatusCode) {
        request.response.code(internals.config.meta.successStatusCode);
      }
    }

    request.response.source = results;
  }
  else {
    internals.assignIfActive(meta, 'page',        query[internals.name('page')]);
    internals.assignIfActive(meta, 'limit',       query[internals.name('limit')]);

    internals.assignIfActive(meta, 'count',       results.length);
    internals.assignIfActive(meta, 'pageCount',   pageCount);
    internals.assignIfActive(meta, 'totalCount',  Utils.isNil(totalCount) ? null : totalCount);

    internals.assignIfActive(meta, 'next',        hasNext ? getUri(currentPage + 1) : null);
    internals.assignIfActive(meta, 'previous',    getUri(currentPage - 1));
    internals.assignIfActive(meta, 'hasNext',     hasNext);
    internals.assignIfActive(meta, 'hasPrevious', hasPrevious);

    internals.assignIfActive(meta, 'self',        getUri(currentPage));
    internals.assignIfActive(meta, 'first',       getUri(1));
    internals.assignIfActive(meta, 'last',        getUri(pageCount));


    const response = {
      [internals.config.meta.name]: meta,
      [internals.config.results.name]: results
    };

    if (source.response) {
      const keys = Object.keys(source.response);

      for (let i = 0; i < keys.length; ++i) {
        const key = keys[i];
        if (key !== internals.config.meta.name &&
            key !== internals.config.results.name) {
          response[key] = source.response[key];
        }
      }
    }

    if (internals.config.meta.successStatusCode) {
      return reply(response).code(internals.config.meta.successStatusCode);
    }

    return reply(response);
  }

  return reply.continue();
};


module.exports = function (config) {

  internals.config = config;

  return {
      onPreHandler: internals.onPreHandler,
      onPostHandler: internals.onPostHandler
  };
};
