'use strict';

const Code = require('code');
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const Hapi = require('hapi');
const Joi = require('joi');

const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;

const pluginName = '../lib';

const users = [];
for (let i = 0; i < 20; ++i) {
    users.push({
        name: `name${i}`,
        username: `username${i}`
    });
}

const register = function () {

    const connection = { host: 'localhost' };
    const server = new Hapi.Server(connection);

    server.route({
        method: 'GET',
        path: '/',
        handler: (request, h) => []
    });

    server.route({
        method: 'GET',
        path: '/empty',
        handler: (request, h) => h.paginate([], 0)
    });

    server.route({
        method: 'GET',
        path: '/exception',
        handler: (request, h) => {

            throw new Error('test');
            return h.paginate([], 0);
        }
    });


    server.route({
        method: 'GET',
        path: '/users',
        handler: (request, h) => {

            const limit = request.query.limit;
            const page = request.query.page;
            const pagination = request.query.pagination;

            const offset = limit * (page - 1);
            const response = [];

            for (let i = offset; i < (offset + limit) && i < users.length; ++i) {
                response.push(users[i]);
            }

            if (pagination) {
                return h.paginate(response, users.length);
            }

            return h.response(users);
        }
    });


    server.route({
        method: 'GET',
        path: '/users2',
        handler: (request, h) => {

            const limit = request.query.limit;
            const page = request.query.page;
            const pagination = request.query.pagination;

            const offset = limit * (page - 1);
            const response = [];

            for (let i = offset; i < (offset + limit) && i < users.length; ++i) {
                response.push(users[i]);
            }

            if (pagination) {
                return h.paginate({ results: response, otherKey: 'otherKey', otherKey2: 'otherKey2' },
                    users.length,
                    { key: 'results' });
            }

            return h.response(users);
        }
    });

    server.route({
        method: 'GET',
        path: '/users3',
        handler: (request, h) => {

            const limit = request.query.limit;
            const page = request.query.page;
            const resultsKey = request.query.resultsKey;
            const totalCountKey = request.query.totalCountKey;

            const offset = limit * (page - 1);

            const response = {};

            response[resultsKey] = [];
            response[totalCountKey] = users.length;

            for (let i = offset; i < (offset + limit) && i < users.length; ++i) {
                response[resultsKey].push(users[i]);
            }

            return h.response(response);
        }
    });

    server.route({
        method: 'GET',
        path: '/enabled',
        config: {
            plugins: {
                pagination: {
                    enabled: true
                }
            },
            handler: (request, h) => []
        }
    });

    server.route({
        method: 'GET',
        path: '/disabled',
        config: {
            plugins: {
                pagination: {
                    enabled: false
                }
            },
            handler: (request, h) => []
        }
    });



    server.route({
        method: 'GET',
        path: '/defaults',
        config: {
            plugins: {
                pagination: {
                    defaults: {
                        pagination: false,
                        limit: 10,
                        page: 2
                    }
                }
            }
        },
        handler: (request, h) => {

            const limit = request.query.limit;
            const page = request.query.page;
            const pagination = request.query.pagination;

            const offset = limit * (page - 1);
            const response = [];

            for (let i = offset; i < (offset + limit) && i < users.length; ++i) {
                response.push(users[i]);
            }


            if (pagination) {
                return h.paginate(response, users.length);
            }

            return h.response(users);
        }
    });

    server.route({
        method: 'POST',
        path: '/users',
        handler: (request, h) => 'Works'
    });

    server.route({
        method: 'GET',
        path: '/array-exception',
        handler: (request, h) => {

            return h.response({
                message: 'Custom Error Message'
            }).code(500);
        }
    });

    // Dummy Websocket upgrade request
    server.route({
        method: 'GET',
        path: '/ws-upgrade',
        handler: (request, h) => {
            // Some WS WORKS for upgrade request
            return h.response({
                message: 'WS Upgrade request'
            }).code(101);
        }
    });

    server.route({
        method: 'GET',
        path: '/query-params',
        config: {
            validate: {
                query: {
                    testDate: Joi.date(),
                    testArray: Joi.array(),
                    testObject: Joi.object(),
                    page: Joi.number(),
                    limit: Joi.number()
                }
            }
        },
        handler: (request, h) => {

            return h.paginate([{}, {}, {}], 3);
        }
    });

    server.route({
        method: 'GET',
        path: '/custom-header',
        handler: (request, h) => {
            return h.paginate([{}, {}, {}], 3).header('custom-header', 'pizza');
        }
    });

    return server;
};

describe('Test with defaults values', () => {

    it('Test if limit default is added to request object', async () => {

        const server = register();
        await server.register(require(pluginName));

        const request = {
            method: 'GET',
            url: '/'
        };

        const res = await server.inject(request);
        expect(res.request.query.limit).to.equal(25);
        expect(res.request.query.page).to.equal(1);
        expect(res.request.response.source.meta.totalCount).to.be.null();
    });


    it('Test with additional query string', async () => {

        const server = register();
        await server.register(require(pluginName));

        const res = await server.inject({
            method: 'GET',
            url: '/?param=1&paramm=2'
        });

        expect(res.request.query.param).to.equal('1');
        expect(res.request.query.paramm).to.equal('2');
    });


    it('should set the default response status code when data paginated', async () => {

        const server = register();
        await server.register(require(pluginName));

        const res = await server.inject({
            method: 'GET',
            url: '/users'
        });

        expect(res.statusCode).to.equal(200);
    });
});

describe('Override default values', () => {

    it('Override default limit and page', async () => {

        const options = {
            query: {
                limit: {
                    default: 7,
                    name: 'myLimit'
                },
                page: {
                    default: 2,
                    name: 'myPage'
                }
            }
        };

        const server = register();
        await server.register({
            plugin: require(pluginName),
            options
        });

        const res = await server.inject({
            method: 'GET',
            url: '/'
        });

        const query = res.request.query;
        expect(query.limit).to.be.undefined();
        expect(query.page).to.be.undefined();

        const limit = options.query.limit;
        const page = options.query.page;
        expect(query[limit.name]).to.equal(limit.default);
        expect(query[page.name]).to.equal(page.default);
    });


    it('Override defaults routes with include', async () => {

        const options = {
            routes: {
                include: ['/']
            }
        };

        const server = register();
        await server.register({
            plugin: require(pluginName),
            options
        });


        const res = await server.inject({
            method: 'GET',
            url: '/'
        });

        const query = res.request.query;
        expect(query.limit).to.equal(25);
        expect(query.page).to.equal(1);
    });

    it('Override defaults routes with include 2', async () => {

        const options = {
            routes: {
                include: ['/']
            }
        };

        const server = register();
        await server.register({
            plugin: require(pluginName),
            options
        });

        const res = await server.inject({
            method: 'GET',
            url: '/users'
        });

        const query = res.request.query;
        expect(query.limit).to.be.undefined();
        expect(query.page).to.be.undefined();
    });


    it('Override defaults routes with regex in include', async () => {

        const options = {
            routes: {
                include: [/^\/u.*s$/]
            }
        };

        const server = register();
        await server.register({
            plugin: require(pluginName),
            options
        });


        const res = await server.inject({
            method: 'GET',
            url: '/users'
        });

        const query = res.request.query;
        expect(query.limit).to.equal(25);
        expect(query.page).to.equal(1);
    });

    it('Override defaults routes with both regex and string in include', async () => {

        const options = {
            routes: {
                include: [/^\/hello$/, '/users']
            }

        };
        const server = register();
        await server.register({
            plugin: require(pluginName),
            options
        });

        const res = await server.inject({
            method: 'GET',
            url: '/users'
        });
        const query = res.request.query;
        expect(query.limit).to.equal(25);
        expect(query.page).to.equal(1);


    });

    it('Override defaults routes with regex in include without a match', async () => {

        const options = {
            routes: {
                include: [/^\/hello.*$/]
            }
        };

        const server = register();
        await server.register({
            plugin: require(pluginName),
            options
        });

        const res = await server.inject({
            method: 'GET',
            url: '/users'
        });

        const query = res.request.query;
        expect(query.limit).to.be.undefined();
        expect(query.page).to.be.undefined();

    });

    it('Override defaults routes with exclude', async () => {

        const options = {
            routes: {
                include: ['*'],
                exclude: ['/']
            }
        };

        const server = register();
        await server.register({
            plugin: require(pluginName),
            options
        });

        const res = await server.inject({
            method: 'GET',
            url: '/'
        });

        const query = res.request.query;
        expect(query.limit).to.be.undefined();
        expect(query.page).to.be.undefined();

    });

    it('Override defaults routes with exclude 2', async () => {

        const options = {
            routes: {
                include: ['/users'],
                exclude: ['/']
            }
        };

        const server = register();
        await server.register({
            plugin: require(pluginName),
            options
        });

        const res = await server.inject({
            method: 'GET',
            url: '/'
        });

        const query = res.request.query;
        expect(query.limit).to.be.undefined();
        expect(query.page).to.be.undefined();

    });

    it('Override defaults routes with regex in exclude', async () => {

        const options = {
            routes: {
                include: ['*'],
                exclude: [/^\/.*/]
            }
        };

        const server = register();
        await server.register({
            plugin: require(pluginName),
            options
        });

        const res = await server.inject({
            method: 'GET',
            url: '/'
        });

        const query = res.request.query;
        expect(query.limit).to.be.undefined();
        expect(query.page).to.be.undefined();
    });

    it('Override defaults routes with both regex and string in exclude', async () => {

        const options = {
            routes: {
                include: ['*'],
                exclude: [/^nothing/, '/']
            }
        };

        const server = register();
        await server.register({
            plugin: require(pluginName),
            options
        });


        const res = await server.inject({
            method: 'GET',
            url: '/'
        });

        const query = res.request.query;
        expect(query.limit).to.be.undefined();
        expect(query.page).to.be.undefined();


    });

    it('Override results name', async () => {

        const server = register();
        await server.register({
            plugin: require(pluginName),
            options: {
                results: {
                    name: 'rows'
                }
            }
        });

        const res = await server.inject({
            url: '/users?limit=12',
            method: 'GET'
        });


        expect(res.request.response.source.rows).to.be.an.array();
        expect(res.request.response.source.rows).to.have.length(12);

    });

    it('Override reply parametr (results) name', async () => {

        const resultsKey = 'rows';
        const server = register();
        await server.register({
            plugin: require(pluginName),
            options: {
                reply: {
                    parameters: {
                        results: {
                            name: 'rows'
                        }
                    }
                }
            }
        });

        const res = await server.inject({
            url: '/users3?limit=12&resultsKey=' + resultsKey,
            method: 'GET'
        });

        expect(res.request.response.source.results).to.be.an.array();
        expect(res.request.response.source.results).to.have.length(12);


    });

    it('Override reply parametr (totalCount) name', async () => {

        const totalCountKey = 'total';

        const server = register();
        await server.register({
            plugin: require(pluginName),
            options: {
                reply: {
                    parameters: {
                        totalCount: {
                            name: 'total'
                        }
                    }
                }
            }
        });

        const res = await server.inject({
            url: '/users3?limit=12&resultsKey=results&totalCountKey=' + totalCountKey,
            method: 'GET'
        });

        expect(res.request.response.source.meta.totalCount).to.equal(users.length);
    });

    it('Override defaults routes with regex without a match', async () => {

        const options = {
            routes: {
                include: ['*'],
                exclude: [/^nothing/]
            }
        };

        const server = register();
        await server.register({
            plugin: require(pluginName),
            options
        });


        const res = await server.inject({
            method: 'GET',
            url: '/'
        });

        const query = res.request.query;
        expect(query.limit).to.equal(25);
        expect(query.page).to.equal(1);
    });

    it('Override names of meta', async () => {

        const options = {
            meta: {
                name: 'myMeta',
                count: {
                    active: true,
                    name: 'myCount'
                },
                totalCount: {
                    active: true,
                    name: 'myTotalCount'
                },
                pageCount: {
                    active: true,
                    name: 'myPageCount'
                },
                self: {
                    active: true,
                    name: 'mySelf'
                },
                previous: {
                    active: true,
                    name: 'myPrevious'
                },
                next: {
                    active: true,
                    name: 'myNext'
                },
                hasNext: {
                    active: true,
                    name: 'myHasNext'
                },
                hasPrevious: {
                    active: true,
                    name: 'myHasPrev'
                },
                first: {
                    active: true,
                    name: 'myFirst'
                },
                last: {
                    active: true,
                    name: 'myLast'
                },
                limit: {
                    active: true
                },
                page: {
                    active: true
                }
            }
        };

        const server = register();
        await server.register({
            plugin: require(pluginName),
            options
        });


        const res = await server.inject({
            method: 'GET',
            url: '/'
        });

        const response = res.request.response.source;
        const names = options.meta;

        const meta = response[names.name];
        expect(meta).to.be.an.object();
        expect(meta.limit).to.equal(25);
        expect(meta.page).to.equal(1);
        expect(meta[names.count.name]).to.equal(0);
        expect(meta[names.totalCount.name]).to.be.null();
        expect(meta[names.pageCount.name]).to.be.null();
        expect(meta[names.previous.name]).to.be.null();
        expect(meta[names.next.name]).to.be.null();
        expect(meta[names.hasNext.name]).to.be.false();
        expect(meta[names.hasPrevious.name]).to.be.false();
        expect(meta[names.last.name]).to.be.null();
        expect(meta[names.first.name]).to.part.include(['http://localhost/?', ' page=1', '&', 'limit=25']);
        expect(meta[names.self.name]).to.part.include(['http://localhost/?', 'page=1', '&', 'limit=25']);
        expect(response.results).to.be.an.array();
        expect(response.results).to.have.length(0);


    });

    it('Override query parameter pagination - set active to false', async () => {

        const options = {
            query: {
                limit: {
                    default: 10
                },
                pagination: {
                    default: true,
                    active: false
                }
            }
        };

        const server = register();
        await server.register({
            plugin: require(pluginName),
            options
        });

        const res = await server.inject({
            method: 'GET',
            url: '/users?pagination=false'
        });

        const response = res.request.response.source;
        expect(response.results).to.be.an.array();
        expect(response.results).to.have.length(10);

    });

    it('Override meta - set active to false', async () => {

        const options = {
            meta: {
                name: 'meta',
                count: {
                    active: false
                },
                totalCount: {
                    active: false
                },
                pageCount: {
                    active: false
                },
                self: {
                    active: false
                },
                previous: {
                    active: false
                },
                next: {
                    active: false
                },
                hasNext: {
                    active: false
                },
                hasPrevious: {
                    active: false
                },
                first: {
                    active: false
                },
                last: {
                    active: false
                },
                limit: {
                    active: false
                },
                page: {
                    active: false
                }
            }
        };

        const server = register();
        await server.register({
            plugin: require(pluginName),
            options
        });

        const res = await server.inject({
            method: 'GET',
            url: '/'
        });

        const response = res.request.response.source;
        const names = options.meta;

        const meta = response[names.name];
        expect(meta).to.be.an.object();
        expect(meta.limit).to.be.undefined();
        expect(meta.page).to.be.undefined();
        expect(meta.count).to.be.undefined();
        expect(meta.totalCount).to.be.undefined();
        expect(meta.pageCount).to.be.undefined();
        expect(meta.previous).to.be.undefined();
        expect(meta.next).to.be.undefined();
        expect(meta.hasNext).to.be.undefined();
        expect(meta.hasPrevious).to.be.undefined();
        expect(meta.last).to.be.undefined();
        expect(meta.first).to.be.undefined();
        expect(meta.self).to.be.undefined();
        expect(response.results).to.be.an.array();
        expect(response.results).to.have.length(0);
    });

    it('Override meta location - move metadata to http headers with multiple pages', async () => {

        const options = {
            query: {
                limit: {
                    default: 5
                },
                page: {
                    default: 2
                }
            },
            meta: {
                location: 'header',
                successStatusCode: 206
            }
        };

        const server = register();
        await server.register({
            plugin: require(pluginName),
            options
        });

        const res = await server.inject({
            method: 'GET',
            url: '/users'
        });
        const statusCode = res.request.response.statusCode;
        expect(statusCode).to.equal(206);
        const headers = res.request.response.headers;
        const response = res.request.response.source;
        expect(headers['Content-Range']).to.equal('5-9/20');
        expect(headers.Link).to.be.an.array();
        expect(headers.Link).to.have.length(5);
        expect(headers.Link[0]).match(/rel="self"$/);
        expect(headers.Link[1]).match(/rel="first"$/);
        expect(headers.Link[2]).match(/rel="last"$/);
        expect(headers.Link[3]).match(/rel="next"$/);
        expect(headers.Link[4]).match(/rel="prev"$/);
        expect(response).to.be.an.array();
        expect(response).to.have.length(5);

    });

    it('Override meta location - move metadata to http headers with unique page', async () => {

        const options = {
            meta: {
                location: 'header',
                successStatusCode: 206
            }
        };

        const server = register();
        await server.register({
            plugin: require(pluginName),
            options
        });

        const res = await server.inject({
            method: 'GET',
            url: '/users'
        });
        const statusCode = res.request.response.statusCode;
        expect(statusCode).to.equal(200);
        const headers = res.request.response.headers;
        const response = res.request.response.source;
        expect(headers['Content-Range']).to.not.exist;
        expect(headers.Link).to.not.exist;
        expect(response).to.be.an.array();
        expect(response).to.have.length(20);

    });

    it('Override meta location - move metadata to http headers with first page', async () => {

        const options = {
            query: {
                limit: {
                    default: 5
                },
                page: {
                    default: 1
                }
            },
            meta: {
                location: 'header'
            }
        };

        const server = register();
        await server.register({
            plugin: require(pluginName),
            options
        });

        const res = await server.inject({
            method: 'GET',
            url: '/users'
        });
        const statusCode = res.request.response.statusCode;
        expect(statusCode).to.equal(200);
        const headers = res.request.response.headers;
        const response = res.request.response.source;
        expect(headers['Content-Range']).to.equal('0-4/20');
        expect(headers.Link).to.be.an.array();
        expect(headers.Link).to.have.length(4);
        expect(headers.Link[0]).match(/rel="self"$/);
        expect(headers.Link[1]).match(/rel="first"$/);
        expect(headers.Link[2]).match(/rel="last"$/);
        expect(headers.Link[3]).match(/rel="next"$/);

        expect(response).to.be.an.array();
        expect(response).to.have.length(5);
    });

    it('Override meta location - move metadata to http headers with last page', async () => {

        const options = {
            query: {
                limit: {
                    default: 5
                },
                page: {
                    default: 4
                }
            },
            meta: {
                location: 'header'
            }
        };

        const server = register();
        await server.register({
            plugin: require(pluginName),
            options
        });

        const res = await server.inject({
            method: 'GET',
            url: '/users'
        });

        const statusCode = res.request.response.statusCode;
        expect(statusCode).to.equal(200);
        const headers = res.request.response.headers;
        const response = res.request.response.source;
        expect(headers['Content-Range']).to.equal('15-19/20');
        expect(headers.Link).to.be.an.array();
        expect(headers.Link).to.have.length(4);
        expect(headers.Link[0]).match(/rel="self"$/);
        expect(headers.Link[1]).match(/rel="first"$/);
        expect(headers.Link[2]).match(/rel="last"$/);
        expect(headers.Link[3]).match(/rel="prev"$/);

        expect(response).to.be.an.array();
        expect(response).to.have.length(5);

    });

    it('Override meta location - do not set metadata if requested page is out of range', async () => {

        const options = {
            query: {
                limit: {
                    default: 5
                },
                page: {
                    default: 5
                }
            },
            meta: {
                location: 'header',
                successStatusCode: 206
            }
        };

        const server = register();
        await server.register({
            plugin: require(pluginName),
            options
        });

        const res = await server.inject({
            method: 'GET',
            url: '/users'
        });
        const statusCode = res.request.response.statusCode;
        expect(statusCode).to.equal(200);

        const headers = res.request.response.headers;
        expect(headers['Content-Range']).to.not.exist;
        expect(headers.Link).to.not.exist;

        const response = res.request.response.source;
        expect(response).to.be.an.array();
        expect(response).to.have.length(0);

    });

    it('use custom baseUri instead of server provided uri', async () => {

        const myCustomUri = 'https://127.0.0.1:81';
        const options = {
            meta: {
                baseUri: myCustomUri,
                name: 'meta',
                count: {
                    active: true
                },
                totalCount: {
                    active: true
                },
                pageCount: {
                    active: true
                },
                self: {
                    active: true
                },
                first: {
                    active: true
                }
            }
        };

        const server = register();
        await server.register({
            plugin: require(pluginName),
            options
        });

        const res = await server.inject({
            method: 'GET',
            url: '/'
        });

        const response = res.request.response.source;
        const meta = response.meta;
        expect(meta.first).to.include(myCustomUri);
        expect(meta.self).to.include(myCustomUri);

    });

    it('Override the response status code with a correct value', async () => {

        const options = {
            meta: {
                successStatusCode: 204
            }
        };

        const server = register();
        await server.register({
            plugin: require(pluginName),
            options
        });


        const res = await server.inject({
            method: 'GET',
            url: '/users'
        });
        expect(res.statusCode).to.equal(204);


    });

    it('Override the response status code with an unauthorized status code', async () => {

        const options = {
            meta: {
                successStatusCode: 500
            }
        };

        const server = register();
        const serverRegister = async () => {

            await server.register({
                plugin: require(pluginName),
                options
            });
        };

        await expect(serverRegister()).to.reject();

    });

    it('Override the response status code with an incorrect value', async () => {

        const options = {
            meta: {
                successStatusCode: 500
            }
        };

        const server = register();

        const serverRegister = async () => {

            await server.register({
                plugin: require(pluginName),
                options
            });
        };

        await expect(serverRegister()).to.reject();

    });

    it('Do not override the response status code if no pagination', async () => {

        const server = register();
        await server.register({
            plugin: require(pluginName)
        });

        const res = await server.inject({
            method: 'GET',
            url: '/users?pagination=false'
        });
        expect(res.statusCode).to.equal(200);

    });
});

describe('Custom route options', () => {

    it('Force a route to include pagination', async () => {

        const options = {
            routes: {
                exclude: ['/enabled']
            }
        };

        const server = register();
        await server.register({
            plugin: require(pluginName),
            options
        });

        const res = await server.inject({
            method: 'GET',
            url: '/enabled'
        });

        const query = res.request.query;
        expect(query.limit).to.equal(25);
        expect(query.page).to.equal(1);

    });

    it('Force a route to exclude pagination', async () => {

        const options = {
            routes: {
                include: ['/disabled']
            }
        };

        const server = register();
        await server.register({
            plugin: require(pluginName),
            options
        });

        const res = await server.inject({
            method: 'GET',
            url: '/disabled'
        });

        const query = res.request.query;
        expect(query.limit).to.be.undefined();
        expect(query.page).to.be.undefined();

    });

});


describe('Override on route level', () => {

    it('Overriden defaults on route level with pagination to false', async () => {

        const server = register();

        await server.register(require(pluginName));

        const res = await server.inject({
            method: 'GET',
            url: '/defaults'
        });

        expect(res.request.response.source).to.be.an.array();
        expect(res.request.response.source).to.have.length(20);

    });

    it('Overriden defaults on route level with pagination to true', async () => {

        const server = register();

        await server.register(require(pluginName));

        const res = await server.inject({
            method: 'GET',
            url: '/defaults?pagination=true'
        });

        const response = res.request.response.source;
        expect(response).to.be.an.object();
        expect(response.results).to.have.length(10);
        expect(response.meta.totalCount).to.equal(20);
        expect(res.request.query.limit).to.equal(10);
        expect(res.request.query.page).to.equal(2);

    });

    it('Overriden defaults on route level with limit and page to 5 and 1', async () => {

        const server = register();

        await server.register(require(pluginName));


        const res = await server.inject({
            method: 'GET',
            url: '/defaults?pagination=true&page=1&limit=5'
        });

        const response = res.request.response.source;
        expect(response).to.be.an.object();
        expect(response.results).to.have.length(5);
        expect(response.meta.totalCount).to.equal(20);
        expect(res.request.query.limit).to.equal(5);
        expect(res.request.query.page).to.equal(1);
    });

});



describe('Passing page and limit as query parameters', () => {

    const options = {
        query: {
            limit: {
                default: 5,
                name: 'myLimit'
            },
            page: {
                default: 2,
                name: 'myPage'
            }
        }
    };

    it('Passing limit', async () => {

        const server = register();

        server.register(require(pluginName));

        const res = await server.inject({
            method: 'GET',
            url: '/?limit=5'
        });

        expect(res.request.query.limit).to.equal(5);
        expect(res.request.query.page).to.equal(1);


    });

    it('Wrong limit and page should return the defaults', async () => {

        const server = register();

        await server.register(require(pluginName));

        const res = await server.inject({
            method: 'GET',
            url: '/?limit=abc10&page=c2'
        });

        expect(res.request.query.limit).to.equal(25);
        expect(res.request.query.page).to.equal(1);

    });

    it('Wrong limit with badRequest behavior should return 400 bad request', async () => {

        const server = register();

        await server.register({
            plugin: require(pluginName),
            options: {
                query: {
                    invalid: 'badRequest'
                }
            }
        });

        const res = await server.inject({
            method: 'GET',
            url: '/?limit=abc10'
        });

        expect(res.request.response.source.statusCode).to.equal(400);
        expect(res.request.response.statusCode).to.equal(400);
    });

    it('Wrong page with badRequest behavior should return 400 bad request', async () => {

        const server = register();

        await server.register({
            plugin: require(pluginName),
            options: {
                query: {
                    invalid: 'badRequest'
                }
            }
        });

        const res = await server.inject({
            method: 'GET',
            url: '/?page=abc10'
        });

        expect(res.request.response.source.statusCode).to.equal(400);
        expect(res.request.response.statusCode).to.equal(400);
    });

    it('Overriding and passing limit', async () => {

        const server = register();

        await server.register({
            plugin: require(pluginName),
            options
        });


        const res = await server.inject({
            method: 'GET',
            url: '/?myLimit=7'
        });

        expect(res.request.query[options.query.limit.name]).to.equal(7);
        expect(res.request.query[options.query.page.name]).to.equal(2);

    });

    it('Passing page', async () => {

        const server = register();

        await server.register(require(pluginName));


        const res = await server.inject({
            method: 'GET',
            url: '/?page=5'
        });

        expect(res.request.query.page).to.equal(5);

    });

    it('Overriding and passing page', async () => {

        const server = register();

        await server.register({
            plugin: require(pluginName),
            options
        });

        const res = await server.inject({
            method: 'GET',
            url: '/?myPage=5'
        });

        expect(res.request.query[options.query.limit.name]).to.equal(5);
        expect(res.request.query[options.query.page.name]).to.equal(5);

    });
});

describe('Test /users route', () => {

    it('Test default with totalCount added to request object', async () => {

        const urlForPage = (page) => ['http://localhost/users?', 'page=' + page, '&', 'limit=5'];

        const server = register();
        await server.register(require(pluginName));


        const res = await server.inject({
            method: 'GET',
            url: '/users?page=2&limit=5'
        });

        const response = res.request.response.source;
        const meta = response.meta;
        expect(meta).to.be.an.object();
        expect(meta.count).to.equal(5);
        expect(meta.totalCount).to.equal(20);
        expect(meta.pageCount).to.equal(4);
        expect(meta.previous).to.part.include(urlForPage(1));
        expect(meta.next).to.part.include(urlForPage(3));
        expect(meta.last).to.part.include(urlForPage(4));
        expect(meta.first).to.part.include(urlForPage(1));
        expect(meta.self).to.part.include(urlForPage(2));

        expect(response.results).to.be.an.array();
        expect(response.results).to.have.length(5);

    });

    it('Test hasPrev behave correctly', async () => {

        const server = register();
        await server.register({
            plugin: require(pluginName),
            options: {
                meta: {
                    hasPrevious: {
                        active: true
                    }
                }
            }
        });


        const res = await server.inject({
            method: 'GET',
            url: '/users?page=1&limit=5'
        });
        const response = res.request.response.source;
        const meta = response.meta;
        expect(meta.hasPrevious).to.equal(false);
    });
});

describe('Testing pageCount', () => {

    it('Limit is 3, page should be 7', async () => {

        const server = register();
        await server.register(require(pluginName));

        const res = await server.inject({
            method: 'GET',
            url: '/users?limit=3'
        });

        const response = res.request.response.source;
        const meta = response.meta;

        expect(meta.pageCount).to.equal(7);

    });


    it('Limit is 4, page should be 5', async () => {

        const server = register();
        await server.register(require(pluginName));

        const res = await server.inject({
            method: 'GET',
            url: '/users?limit=4'
        });

        const response = res.request.response.source;
        const meta = response.meta;

        expect(meta.pageCount).to.equal(5);
    });


    it('Limit is 1, page should be 20', async () => {

        const server = register();
        await server.register(require(pluginName));

        const res = await server.inject({
            method: 'GET',
            url: '/users?limit=1'
        });

        const response = res.request.response.source;
        const meta = response.meta;

        expect(meta.pageCount).to.equal(20);
    });
});

describe('Post request', () => {

    it('Should work with a post request', async () => {

        const server = register();
        await server.register(require(pluginName));

        const res = await server.inject({
            method: 'POST',
            url: '/users'
        });

        const response = res.request.response.source;

        expect(response).to.equal('Works');

    });
});

describe('Changing pagination query parameter', () => {

    it('Should return the results with no pagination', async () => {

        const server = register();
        await server.register(require(pluginName));

        const res = await server.inject({
            method: 'GET',
            url: '/?pagination=false'
        });

        const response = res.request.response.source;
        expect(response).to.be.an.array();

    });


    it('Pagination to random value (default is true)', async () => {

        const server = register();
        await server.register(require(pluginName));

        const res = await server.inject({
            method: 'GET',
            url: '/?pagination=abcd'
        });

        const response = res.request.response.source;
        expect(response.meta).to.be.an.object();
        expect(response.results).to.be.an.array();

    });

    it('Pagination to random value (default is false)', async () => {

        const server = register();
        await server.register({
            plugin: require(pluginName),
            options: {
                query: {
                    pagination: {
                        default: false
                    }
                }
            }
        });

        const res = await server.inject({
            method: 'GET',
            url: '/?pagination=abcd'
        });

        const response = res.request.response.source;
        expect(response).to.be.an.array();

    });

    it('Pagination explicitely to true', async () => {

        const options = {
            meta: {
                name: 'myMeta',
                count: {
                    active: true,
                    name: 'myCount'
                },
                totalCount: {
                    active: true,
                    name: 'myTotalCount'
                },
                pageCount: {
                    active: true,
                    name: 'myPageCount'
                },
                self: {
                    active: true,
                    name: 'mySelf'
                },
                previous: {
                    active: true,
                    name: 'myPrevious'
                },
                next: {
                    active: true,
                    name: 'myNext'
                },
                hasNext: {
                    active: true,
                    name: 'myHasNext'
                },
                hasPrevious: {
                    active: true,
                    name: 'myHasPrevious'
                },
                first: {
                    active: true,
                    name: 'myFirst'
                },
                last: {
                    active: true,
                    name: 'myLast'
                },
                limit: {
                    active: true
                },
                page: {
                    active: true
                }
            }
        };

        const server = register();
        await server.register({
            plugin: require(pluginName),
            options
        });
        const res = await server.inject({
            method: 'GET',
            url: '/?pagination=true'
        });

        const response = res.request.response.source;
        const names = options.meta;

        const meta = response[names.name];
        expect(meta).to.be.an.object();
        expect(meta.limit).to.equal(25);
        expect(meta.page).to.equal(1);
        expect(meta[names.count.name]).to.equal(0);
        expect(meta[names.totalCount.name]).to.be.null();
        expect(meta[names.pageCount.name]).to.be.null();
        expect(meta[names.previous.name]).to.be.null();
        expect(meta[names.next.name]).to.be.null();
        expect(meta[names.hasNext.name]).to.be.false();
        expect(meta[names.hasPrevious.name]).to.be.false();
        expect(meta[names.last.name]).to.be.null();
        expect(meta[names.first.name]).to.part.include(['http://localhost/?', ' page=1', '&', 'limit=25']);
        expect(meta[names.self.name]).to.part.include(['http://localhost/?', 'page=1', '&', 'limit=25']);
        expect(response.results).to.be.an.array();
        expect(response.results).to.have.length(0);

    });

    it('Pagination default is false', async () => {

        const options = {
            query: {
                pagination: {
                    default: false
                }
            },
            meta: {
                name: 'myMeta',
                count: {
                    active: true,
                    name: 'myCount'
                },
                totalCount: {
                    active: true,
                    name: 'myTotalCount'
                },
                pageCount: {
                    active: true,
                    name: 'myPageCount'
                },
                self: {
                    active: true,
                    name: 'mySelf'
                },
                previous: {
                    active: true,
                    name: 'myPrevious'
                },
                next: {
                    active: true,
                    name: 'myNext'
                },
                hasNext: {
                    active: true,
                    name: 'myHasNext'
                },
                hasPrevious: {
                    active: true,
                    name: 'myHasPrevious'
                },
                first: {
                    active: true,
                    name: 'myFirst'
                },
                last: {
                    active: true,
                    name: 'myLast'
                },
                limit: {
                    active: true
                },
                page: {
                    active: true
                }
            }
        };
        const server = register();
        await server.register({
            plugin: require(pluginName),
            options
        });


        const res = await server.inject({
            method: 'GET',
            url: '/?pagination=true'
        });

        const response = res.request.response.source;
        const names = options.meta;

        const meta = response[names.name];
        expect(meta).to.be.an.object();
        expect(meta.limit).to.equal(25);
        expect(meta.page).to.equal(1);
        expect(meta[names.count.name]).to.equal(0);
        expect(meta[names.totalCount.name]).to.be.null();
        expect(meta[names.pageCount.name]).to.be.null();
        expect(meta[names.previous.name]).to.be.null();
        expect(meta[names.next.name]).to.be.null();
        expect(meta[names.hasNext.name]).to.be.false();
        expect(meta[names.hasPrevious.name]).to.be.false();
        expect(meta[names.last.name]).to.be.null();
        expect(meta[names.first.name]).to.part.include(['pagination=true']);
        expect(meta[names.self.name]).to.part.include(['pagination=true']);
        expect(response.results).to.be.an.array();
        expect(response.results).to.have.length(0);

    });
});

describe('Wrong options', () => {

    it('Should return an error on register', async () => {

        const server = register();
        const serverRegister = async () => {

            await server.register({
                plugin: require(pluginName),
                options: {
                    query: {
                        limit: {
                            default: 'abcd'
                        }
                    }
                }
            });
        };

        await expect(serverRegister()).to.reject();
    });

    it('Should return an error on register', async () => {

        const server = register();

        const serverRegister = async () => {

            await server.register({
                plugin: require(pluginName),
                options: {
                    meta: {
                        name: 0
                    }
                }
            });
        };

        await expect(serverRegister()).to.reject();

    });

    it('Should return an error on register', async () => {

        const server = register();

        const serverRegister = async () => {

            await server.register({
                plugin: require(pluginName),
                options: {
                    query: {
                        limit: {
                            default: 0
                        }
                    }
                }
            });
        };

        await expect(serverRegister()).to.reject();

    });

    it('Should return an error on register', async () => {

        const server = register();

        const serverRegister = async () => {

            await server.register({
                plugin: require(pluginName),
                options: {
                    meta: {
                        totalCount: {
                            active: 'abc'
                        }
                    }
                }
            });
        };

        await expect(serverRegister()).to.reject();

    });
});

describe('Results with other keys', () => {

    it('Should return the response with the original response keys', async () => {

        const server = register();
        await server.register(require(pluginName));

        const request = {
            method: 'GET',
            url: '/users2'
        };

        const res = await server.inject(request);

        const response = res.request.response.source;
        expect(response.otherKey).to.equal('otherKey');
        expect(response.otherKey2).to.equal('otherKey2');
        expect(response.meta).to.exists();
        expect(response.results).to.exists();

    });

    it('Should return an internal server error', async () => {

        const server = register();


        await server.register(require(pluginName));


        server.route({
            method: 'GET',
            path: '/error',
            handler: (request, h) => {

                return h.paginate({ results: [] }, 0);
            }
        });

        const request = {
            method: 'GET',
            url: '/error'
        };

        const res = await server.inject(request);

        expect(res.request.response.statusCode).to.equal(500);

    });

    it('Should return an internal server error #2', async () => {

        const server = register();


        await server.register(require(pluginName));


        server.route({
            method: 'GET',
            path: '/error',
            handler: (request, h) => {

                return h.paginate({ results: [] }, 0, { key: 'res' });
            }
        });

        const request = {
            method: 'GET',
            url: '/error'
        };

        const res = await server.inject(request);

        expect(res.request.response.statusCode).to.equal(500);
    });

    it('Should not override meta and results', async () => {

        const server = register();

        await server.register(require(pluginName));

        server.route({
            method: 'GET',
            path: '/nooverride',
            handler: (request, h) => {

                return h.paginate({ res: [], results: 'results', meta: 'meta' }, 0, { key: 'res' });
            }
        });

        const request = {
            method: 'GET',
            url: '/nooverride'
        };

        const res = await server.inject(request);

        const response = res.request.response.source;
        expect(response.meta).to.not.equal('meta');
        expect(response.results).to.not.equal('results');

    });
});

describe('Empty result set', () => {

    it('Counts should be 0', async () => {

        const server = register();
        await server.register(require(pluginName));

        const request = {
            method: 'GET',
            url: '/empty'
        };

        const res = await server.inject(request);

        const response = res.request.response.source;
        expect(response.meta.totalCount).to.equal(0);
        expect(response.meta.pageCount).to.equal(0);
        expect(response.meta.count).to.equal(0);

    });

    it('Staus code should be >=200 & <=299', async () => {

        const server = register();
        await server.register(require(pluginName));

        const request = {
            method: 'GET',
            url: '/empty'
        };

        const res = await server.inject(request);

        const response = res.request.response;
        expect(response.statusCode).to.be.greaterThan(199);
        expect(response.statusCode).to.be.lessThan(300);
    });
});

describe('Exception', () => {

    it('Should not continue on exception', async () => {

        const server = register();
        await server.register(require(pluginName));
        const request = {
            method: 'GET',
            url: '/exception'
        };

        const res = await server.inject(request);
        expect(res.request.response.statusCode).to.equal(500);

    });

    it('Should not process further if response code is not in 200 - 299 range', async () => {

        const server = register();
        await server.register(require(pluginName));
        const request = {
            method: 'GET',
            url: '/array-exception'
        };

        const res = await server.inject(request);

        const response = res.request.response.source;
        const message = response.message;
        expect(message).to.equal('Custom Error Message');
        expect(res.request.response.statusCode).to.equal(500);

    });

    it('Should not process further if upgrade request is received', async () => {

        const server = register();
        await server.register(require(pluginName));

        const request = {
            method: 'GET',
            url: '/ws-upgrade'
        };

        const res = await server.inject(request);
        expect(res.request.response.statusCode).to.equal(101);

    });
});

describe('Override on route level error', () => {

    it('Should return an error', async () => {

        const server = register();
        server.route({
            path: '/error',
            method: 'GET',
            config: {
                plugins: {
                    pagination: {
                        defaults: {
                            limit: 'a'
                        }
                    }
                },
                handler: (request, h) => {

                    return;
                }
            }
        });

        const serverRegister = async () => {

            await server.register(require(pluginName));
        };

        await expect(serverRegister()).to.reject();
    });

    it('Should return an error', async () => {

        const server = register();
        server.route({
            path: '/error',
            method: 'GET',
            config: {
                plugins: {
                    pagination: {
                        defaults: {
                            page: 'a'
                        }
                    }
                },
                handler: (request, h) => h()
            }
        });

        const serverRegister = async () => {

            await server.register(require(pluginName));
        };

        await expect(serverRegister()).to.reject();
    });

    it('Should return an error', async () => {

        const server = register();
        server.route({
            path: '/error',
            method: 'GET',
            config: {
                plugins: {
                    pagination: {
                        defaults: {
                            pagination: 'a'
                        }
                    }
                },
                handler: (request, h) => h()
            }
        });

        const serverRegister = async () => {

            await server.register(require(pluginName));
        };

        await expect(serverRegister()).to.reject();
    });

    it('Should return an error', async () => {

        const server = register();
        server.route({
            path: '/error',
            method: 'GET',
            config: {
                plugins: {
                    pagination: {
                        enabled: 'a'
                    }
                },
                handler: (request, h) => h()
            }
        });

        const serverRegister = async () => {

            await server.register(require(pluginName));
        };

        await expect(serverRegister()).to.reject();
    });
});

describe('Empty baseUri should give relative url', () => {

    it('use custom baseUri instead of server provided uri', async () => {

        const options = {
            meta: {
                baseUri: ''
            }
        };

        const urlForPage = (page) => ['/users?', 'page=' + page, '&', 'limit=5'];

        const server = register();
        await server.register({
            plugin: require(pluginName),
            options
        });

        const res = await server.inject({
            method: 'GET',
            url: '/users?limit=5'
        });

        const response = res.request.response.source;
        const meta = response.meta;
        expect(meta.first).to.include(urlForPage(1));
        expect(meta.first).to.not.include('localhost');
        expect(meta.self).to.include(urlForPage(1));
        expect(meta.next).to.include(urlForPage(2));

    });
});


describe('Should include original values of query parameters in pagination urls when Joi validation creates objects', () => {

    const urlPrefix = 'http://localhost/query-params?';
    const urlPrefixLen = urlPrefix.length;
    const expectedCount = 3;

    const splitParams = function (url) {

        expect(url).to.startWith(urlPrefix);
        return url.substr(urlPrefixLen).split('&');
    };

    it('Should include dates in pagination urls', async () => {

        const dateQuery = 'testDate=1983-01-27';

        const server = register();
        await server.register(require(pluginName));


        const request = {
            method: 'GET',
            url: `/query-params?${dateQuery}&page=2&limit=1`
        };

        const res = await server.inject(request);
        expect(res.request.query.testDate).to.be.a.date();
        expect(res.request.query.testDate.toISOString()).to.equal('1983-01-27T00:00:00.000Z');

        const response = res.request.response.source;
        expect(response.meta.count).to.equal(expectedCount);
        expect(response.meta.pageCount).to.equal(expectedCount);
        expect(response.meta.totalCount).to.equal(expectedCount);
        expect(splitParams(response.meta.next)).to.include(dateQuery);
        expect(splitParams(response.meta.previous)).to.include(dateQuery);
        expect(splitParams(response.meta.self)).to.include(dateQuery);
        expect(splitParams(response.meta.first)).to.include(dateQuery);
        expect(splitParams(response.meta.last)).to.include(dateQuery);

    });

    it('Should include arrays in pagination urls', async () => {

        const arrayQuery = `testArray=${encodeURIComponent('[3,4]')}`;

        const server = register();
        await server.register(require(pluginName));


        const request = {
            method: 'GET',
            url: `/query-params?${arrayQuery}&page=2&limit=1`
        };

        const res = await server.inject(request);
        expect(res.request.query.testArray).to.be.an.array().and.only.include([3, 4]);

        const response = res.request.response.source;
        expect(response.meta.count).to.equal(expectedCount);
        expect(response.meta.pageCount).to.equal(expectedCount);
        expect(response.meta.totalCount).to.equal(expectedCount);
        expect(splitParams(response.meta.next)).to.include(arrayQuery);
        expect(splitParams(response.meta.previous)).to.include(arrayQuery);
        expect(splitParams(response.meta.self)).to.include(arrayQuery);
        expect(splitParams(response.meta.first)).to.include(arrayQuery);
        expect(splitParams(response.meta.last)).to.include(arrayQuery);

    });

    it('Should include objects in pagination urls', async () => {

        const objectQuery = `testObject=${encodeURIComponent(JSON.stringify({ a: 1, b: 2 }))}`;

        const server = register();
        await server.register(require(pluginName));

        const request = {
            method: 'GET',
            url: `/query-params?${objectQuery}&page=2&limit=1`
        };

        const res = await server.inject(request);
        expect(res.request.query.testObject).to.be.an.object().and.only.include({ a: 1, b: 2 });

        const response = res.request.response.source;
        expect(response.meta.count).to.equal(expectedCount);
        expect(response.meta.pageCount).to.equal(expectedCount);
        expect(response.meta.totalCount).to.equal(expectedCount);
        expect(splitParams(response.meta.next)).to.include(objectQuery);
        expect(splitParams(response.meta.previous)).to.include(objectQuery);
        expect(splitParams(response.meta.self)).to.include(objectQuery);
        expect(splitParams(response.meta.first)).to.include(objectQuery);
        expect(splitParams(response.meta.last)).to.include(objectQuery);

    });
});

describe('Include custom headers', () => {
    it('Should include any custom-header set in the pre-processed response', async () => {
        const server = register();
        await server.register(require(pluginName));

        const request = {
            method: 'GET',
            url: `/custom-header`
        };

        const customHeaderName = 'custom-header';
        const customHeaderValue = 'pizza';
        const expectedCount = 3;
        const expectedPageCount = 1;

        const res = await server.inject(request);
        expect(res.request.response.headers[customHeaderName]).to.equal(customHeaderValue);

        const response = res.request.response.source;
        expect(response.meta.count).to.equal(expectedCount);
        expect(response.meta.pageCount).to.equal(expectedPageCount);
        expect(response.meta.totalCount).to.equal(expectedCount);
    });  
});
