'use strict';

const Code = require('code');
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const Hapi = require('hapi');
const _ = require('lodash');

const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;

const pluginName = '../lib';

const users = _.range(1, 20).map((i) => ({
    name: 'name' + i,
    username: 'username' + i
}));

const register = () => {
    const server = new Hapi.Server();
    server.connection({
        host: 'localhost'
    });

    server.route({
        method: 'GET',
        path: '/',
        handler: (request, reply) => reply([])
    });

    server.route({
        method: 'GET',
        path: '/empty',
        handler: (request, reply) => reply.paginate([], 0)
    });

    server.route({
        method: 'GET',
        path: '/users',
        handler: (request, reply) => {
            const limit = request.query.limit;
            const page = request.query.page;

            const offset = limit * (page - 1);
            const response = [];

            for (let i = offset; i < (offset + limit) && i < users.length; ++i) {
                response.push(users[i]);
            }

            return reply.paginate(response, 20);
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
            handler: (request, reply) => reply([])
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
            handler: (request, reply) => reply([])
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
        handler: (request, reply) => {
            const limit = request.query.limit;
            const page = request.query.page;

            const offset = limit * (page - 1);
            const response = [];

            for (let i = offset; i < (offset + limit) && i < users.length; ++i) {
                response.push(users[i]);
            }

            return reply.paginate(response, 20);
        }
    });

    server.route({
        method: 'POST',
        path: '/users',
        handler: (request, reply) => {
            return reply('Works');
        }
    });

    return server;
};

describe('Register', () => {

    it('fails if too much connections', (done) => {

        const server = register();
        server.connection({ host: 'newhost' });
        server.register(require(pluginName), (err) => {
            expect(err).to.exist();
            expect(err.name).to.equal('ValidationError');
            expect(err.details.message).to.match(/You cannot register this plugin/);
            expect(err.details.context).to.have.length(2);
            done();
        });
    });

});


describe('Test with defaults values', () => {
    it('Test if limit default is added to request object', (done) => {
        const server = register();
        server.register(require(pluginName), (err) => {

            expect(err).to.be.undefined();

            const request = {
                method: 'GET',
                url: '/'
            };

            server.inject(request, (res) => {
                expect(res.request.query.limit).to.equal(25);
                expect(res.request.query.page).to.equal(1);

                done();
            });
        });
    });


    it('Test with additional query string', (done) => {
        const server = register();
        server.register(require(pluginName), (err) => {
            expect(err).to.be.undefined();

            server.inject({
                method: 'GET',
                url: '/?param=1&paramm=2'
            }, (res) => {
                expect(res.request.query.param).to.equal('1');
                expect(res.request.query.paramm).to.equal('2');

                done();
            });
        });
    });

});

describe('Override default values', () => {
    it('Override default limit and page', (done) => {
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
        server.register({
            register: require(pluginName),
            options: options
        }, (err) => {
            expect(err).to.be.undefined();

            server.inject({
                method: 'GET',
                url: '/'
            }, (res) => {

                const query = res.request.query;
                expect(query.limit).to.be.undefined();
                expect(query.page).to.be.undefined();

                const limit = options.query.limit;
                const page = options.query.page;
                expect(query[limit.name]).to.equal(limit.default);
                expect(query[page.name]).to.equal(page.default);

                done();
            });
        });
    });

    it('Override defaults routes with include', (done) => {
        const options = {
            routes: {
                include: ['/']
            }
        };
        const server = register();
        server.register({
            register: require(pluginName),
            options: options
        }, (err) => {

            expect(err).to.be.undefined();

            server.inject({
                method: 'GET',
                url: '/'
            }, (res) => {

                const query = res.request.query;
                expect(query.limit).to.equal(25);
                expect(query.page).to.equal(1);

                done();
            });
        });


    });

    it('Override defaults routes with include 2', (done) => {
        const options = {
            routes: {
                include: ['/']
            }
        };
        const server = register();
        server.register({
            register: require(pluginName),
            options: options
        }, (err) => {
            expect(err).to.be.undefined();

            server.inject({
                method: 'GET',
                url: '/users'
            }, (res) => {

                const query = res.request.query;
                expect(query.limit).to.be.undefined();
                expect(query.page).to.be.undefined();

                done();
            });
        });


    });

    it('Override defaults routes with regex in include', (done) => {
        const options = {
            routes: {
                include: [/^\/u.*s$/]
            }
        };
        const server = register();
        server.register({
            register: require(pluginName),
            options: options
        }, (err) => {

            expect(err).to.be.undefined();

            server.inject({
                method: 'GET',
                url: '/users'
            }, (res) => {

                const query = res.request.query;
                expect(query.limit).to.equal(25);
                expect(query.page).to.equal(1);

                done();
            });
        });
    });

    it('Override defaults routes with both regex and string in include', (done) => {
        const options = {
            routes: {
                include: [/^\/hello$/, "/users"]
            }
        };
        const server = register();
        server.register({
            register: require(pluginName),
            options: options
        }, (err) => {

            expect(err).to.be.undefined();

            server.inject({
                method: 'GET',
                url: '/users'
            }, (res) => {

                const query = res.request.query;
                expect(query.limit).to.equal(25);
                expect(query.page).to.equal(1);

                done();
            });
        });
    });

    it('Override defaults routes with regex in include without a match', (done) => {
        const options = {
            routes: {
                include: [/^\/hello.*$/]
            }
        };
        const server = register();
        server.register({
            register: require(pluginName),
            options: options
        }, (err) => {

            expect(err).to.be.undefined();

            server.inject({
                method: 'GET',
                url: '/users'
            }, (res) => {

                const query = res.request.query;
                expect(query.limit).to.be.undefined();
                expect(query.page).to.be.undefined();

                done();
            });
        });
    });

    it('Override defaults routes with exclude', (done) => {
        const options = {
            routes: {
                include: ['*'],
                exclude: ['/']
            }
        };
        const server = register();
        server.register({
            register: require(pluginName),
            options: options
        }, (err) => {
            expect(err).to.be.undefined();

            server.inject({
                method: 'GET',
                url: '/'
            }, (res) => {

                const query = res.request.query;
                expect(query.limit).to.be.undefined();
                expect(query.page).to.be.undefined();

                done();
            });
        });


    });

    it('Override defaults routes with exclude 2', (done) => {
        const options = {
            routes: {
                include: ['/users'],
                exclude: ['/']
            }
        };
        const server = register();
        server.register({
            register: require(pluginName),
            options: options
        }, (err) => {
            expect(err).to.be.undefined();

            server.inject({
                method: 'GET',
                url: '/'
            }, (res) => {


                const query = res.request.query;
                expect(query.limit).to.be.undefined();
                expect(query.page).to.be.undefined();

                done();
            });
        });
    });

    it('Override defaults routes with regex in exclude', (done) => {
        const options = {
            routes: {
                include: ['*'],
                exclude: [/^\/.*/]
            }
        };
        const server = register();
        server.register({
            register: require(pluginName),
            options: options
        }, (err) => {
            expect(err).to.be.undefined();

            server.inject({
                method: 'GET',
                url: '/'
            }, (res) => {

                const query = res.request.query;
                expect(query.limit).to.be.undefined();
                expect(query.page).to.be.undefined();

                done();
            });
        });
    });

    it('Override defaults routes with both regex and string in exclude', (done) => {
        const options = {
            routes: {
                include: ['*'],
                exclude: [/^nothing/, "/"]
            }
        };
        const server = register();
        server.register({
            register: require(pluginName),
            options: options
        }, (err) => {
            expect(err).to.be.undefined();

            server.inject({
                method: 'GET',
                url: '/'
            }, (res) => {

                const query = res.request.query;
                expect(query.limit).to.be.undefined();
                expect(query.page).to.be.undefined();

                done();
            });
        });
    });

    it('Override defaults routes with regex without a match', (done) => {
        const options = {
            routes: {
                include: ['*'],
                exclude: [/^nothing/]
            }
        };
        const server = register();
        server.register({
            register: require(pluginName),
            options: options
        }, (err) => {
            expect(err).to.be.undefined();

            server.inject({
                method: 'GET',
                url: '/'
            }, (res) => {

                const query = res.request.query;
                expect(query.limit).to.equal(25);
                expect(query.page).to.equal(1);

                done();
            });
        });
    });

    it('Override names of meta', (done) => {
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
        server.register({
            register: require(pluginName),
            options: options
        }, (err) => {
            expect(err).to.be.undefined();

            server.inject({
                method: 'GET',
                url: '/'
            }, (res) => {

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
                expect(meta[names.last.name]).to.be.null();
                expect(meta[names.first.name]).to.part.include(['http://localhost/?',' page=1','&','limit=25']);
                expect(meta[names.self.name]).to.part.include(['http://localhost/?', 'page=1', '&', 'limit=25']);
                expect(response.results).to.be.an.array();
                expect(response.results).to.have.length(0);

                done();
            });
        });
    });

    it('Override meta - set active to false', (done) => {
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
        server.register({
            register: require(pluginName),
            options: options
        }, (err) => {
            expect(err).to.be.undefined();

            server.inject({
                method: 'GET',
                url: '/'
            }, (res) => {

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
                expect(meta.last).to.be.undefined();
                expect(meta.first).to.be.undefined();
                expect(meta.self).to.be.undefined();
                expect(response.results).to.be.an.array();
                expect(response.results).to.have.length(0);

                done();
            });
        });
    });


    it('use custom baseUri instead of server provided uri', (done) => {
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
        server.register({
            register: require(pluginName),
            options: options
        }, (err) => {

            expect(err).to.be.undefined();

            server.inject({
                method: 'GET',
                url: '/'
            }, (res) => {

                const response = res.request.response.source;
                const meta = response.meta;
                expect(meta.first).to.include(myCustomUri);
                expect(meta.self).to.include(myCustomUri);
                done();
            });
        });
    });

});

describe('Custom route options', () => {
    it('Force a route to include pagination', (done) => {
        const options = {
            routes: {
                exclude: ['/enabled']
            }
        };
        const server = register();
        server.register({
            register: require(pluginName),
            options: options
        }, (err) => {

            expect(err).to.be.undefined();

            server.inject({
                method: 'GET',
                url: '/enabled'
            }, (res) => {

                const query = res.request.query;
                expect(query.limit).to.equal(25);
                expect(query.page).to.equal(1);

                done();
            });
        });
    });

    it('Force a route to exclude pagination', (done) => {
        const options = {
            routes: {
                include: ['/disabled']
            }
        };
        const server = register();
        server.register({
            register: require(pluginName),
            options: options
        }, (err) => {

            expect(err).to.be.undefined();

            server.inject({
                method: 'GET',
                url: '/disabled'
            }, (res) => {

                const query = res.request.query;
                expect(query.limit).to.be.undefined();
                expect(query.page).to.be.undefined();

                done();
            });
        });


    });
});


describe('Override on route level', () => {

    it('Test if overridden values are correct', (done) => {

        const server = register();

        server.register(require(pluginName), (err) => {
            expect(err).to.be.undefined();

            server.inject({
                method: 'GET',
                url: '/defaults'
            }, (res) => {
                console.log(res.request.query);
                expect(res.request.query.limit).to.equal(10);
                expect(res.request.query.page).to.equal(2);
                done();
            });
        });

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

    it('Passing limit', (done) => {
        const server = register();

        server.register(require(pluginName), (err) => {
            expect(err).to.be.undefined();

            server.inject({
                method: 'GET',
                url: '/?limit=5'
            }, (res) => {
                expect(res.request.query.limit).to.equal(5);
                expect(res.request.query.page).to.equal(1);
                done();
            });
        });
    });

    it('Wrong limit and page should return the defaults', (done) => {

        const server = register();

        server.register(require(pluginName), (err) => {
            expect(err).to.be.undefined();

            server.inject({
                method: 'GET',
                url: '/?limit=abc10&page=c2'
            }, (res) => {
                expect(res.request.query.limit).to.equal(25);
                expect(res.request.query.page).to.equal(1);
                done();
            });
        });

    });

    it('Wrong limit with badRequest behavior should return 400 bad request', (done) => {

        const server = register();

        server.register({
            register: require(pluginName),
            options: {
                query: {
                    invalid: 'badRequest'
                }
            }
        }, (err) => {
            expect(err).to.be.undefined();

            server.inject({
                method: 'GET',
                url: '/?limit=abc10'
            }, (res) => {
                expect(res.request.response.source.statusCode).to.equal(400);
                expect(res.request.response.statusCode).to.equal(400);
                done();
            });
        });
    });

    it('Wrong page with badRequest behavior should return 400 bad request', (done) => {

        const server = register();

        server.register({
            register: require(pluginName),
            options: {
                query: {
                    invalid: 'badRequest'
                }
            }
        }, (err) => {
            expect(err).to.be.undefined();

            server.inject({
                method: 'GET',
                url: '/?page=abc10'
            }, (res) => {
                expect(res.request.response.source.statusCode).to.equal(400);
                expect(res.request.response.statusCode).to.equal(400);
                done();
            });
        });
    });

    it('Overriding and passing limit', (done) => {
        const server = register();

        server.register({
            register: require(pluginName),
            options: options
        }, (err) => {
            expect(err).to.be.undefined();

            server.inject({
                method: 'GET',
                url: '/?myLimit=7'
            }, (res) => {
                expect(res.request.query[options.query.limit.name]).to.equal(7);
                expect(res.request.query[options.query.page.name]).to.equal(2);
                done();
            });
        });
    });

    it('Passing page', (done) => {
        const server = register();

        server.register(require(pluginName), (err) => {
            expect(err).to.be.undefined();

            server.inject({
                method: 'GET',
                url: '/?page=5'
            }, (res) => {
                expect(res.request.query.page).to.equal(5);
                done();
            });
        });
    });

    it('Overriding and passing page', (done) => {
        const server = register();

        server.register({
            register: require(pluginName),
            options: options
        }, (err) => {
            expect(err).to.be.undefined();

            server.inject({
                method: 'GET',
                url: '/?myPage=5'
            }, (res) => {
                expect(res.request.query[options.query.limit.name]).to.equal(5);
                expect(res.request.query[options.query.page.name]).to.equal(5);
                done();
            });
        });
    });
});

describe('Test /users route', () => {

    it('Test default with totalCount added to request object', (done) => {

        const urlForPage = (page) => ['http://localhost/users?', 'page=' + page, '&', 'limit=5'];

        const server = register();
        server.register(require(pluginName), (err) => {
            expect(err).to.be.undefined();

            server.inject({
                method: 'GET',
                url: '/users?page=2&limit=5'
            }, (res) => {

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

                done();
            });
        });
    });
});

describe('Testing pageCount', () => {
    it('Limit is 3, page should be 7', (done) => {
        const server = register();
        server.register(require(pluginName), (err) => {
            expect(err).to.be.undefined();
            server.inject({
                method: 'GET',
                url: '/users?limit=3'
            }, (res) => {
                const response = res.request.response.source;
                const meta = response.meta;

                expect(meta.pageCount).to.equal(7);
                done();
            });
        });
    });


    it('Limit is 4, page should be 5', (done) => {
        const server = register();
        server.register(require(pluginName), (err) => {
            expect(err).to.be.undefined();
            server.inject({
                method: 'GET',
                url: '/users?limit=4'
            }, (res) => {
                const response = res.request.response.source;
                const meta = response.meta;

                expect(meta.pageCount).to.equal(5);
                done();
            });
        });
    });


    it('Limit is 1, page should be 20', (done) => {
        const server = register();
        server.register(require(pluginName), (err) => {
            expect(err).to.be.undefined();
            server.inject({
                method: 'GET',
                url: '/users?limit=1'
            }, (res) => {
                const response = res.request.response.source;
                const meta = response.meta;

                expect(meta.pageCount).to.equal(20);
                done();
            });
        });
    });
});

describe('Post request', () => {
    it('Should work with a post request', (done) => {
        const server = register();
        server.register(require(pluginName), (err) => {
            expect(err).to.be.undefined();
            server.inject({
                method: 'POST',
                url: '/users'
            }, (res) => {
                const response = res.request.response.source;

                expect(response).to.equal('Works');
                done();
            });
        });
    });
});

describe('Changing pagination query parameter', () => {
    it('Should return the results with no pagination', (done) => {
        const server = register();
        server.register(require(pluginName), (err) => {
            expect(err).to.be.undefined();
            server.inject({
                method: 'GET',
                url: '/?pagination=false'
            }, (res) => {
                const response = res.request.response.source;
                expect(response).to.be.an.array();
                done();
            });

        });
    });


    it('Pagination to random value (default is true)', (done) => {
        const server = register();
        server.register(require(pluginName), (err) => {
            expect(err).to.be.undefined();
            server.inject({
                method: 'GET',
                url: '/?pagination=abcd'
            }, (res) => {
                const response = res.request.response.source;
                expect(response.meta).to.be.an.object();
                expect(response.results).to.be.an.array();
                done();
            });

        });
    });

    it('Pagination to random value (default is false)', (done) => {
        const server = register();
        server.register({
            register: require(pluginName),
            options: {
                query: {
                    pagination: {
                        default: false
                    }
                }
            }
        }, (err) => {
            expect(err).to.be.undefined();
            server.inject({
                method: 'GET',
                url: '/?pagination=abcd'
            }, (res) => {
                const response = res.request.response.source;
                expect(response).to.be.an.array();
                done();
            });

        });
    });

    it('Pagination explicitely to true', (done) => {
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
        server.register({
            register: require(pluginName),
            options: options
        }, (err) => {
            expect(err).to.be.undefined();

            server.inject({
                method: 'GET',
                url: '/?pagination=true'
            }, (res) => {

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
                expect(meta[names.last.name]).to.be.null();
                expect(meta[names.first.name]).to.part.include(['http://localhost/?',' page=1','&','limit=25']);
                expect(meta[names.self.name]).to.part.include(['http://localhost/?', 'page=1', '&', 'limit=25']);
                expect(response.results).to.be.an.array();
                expect(response.results).to.have.length(0);

                done();
            });
        });
    });

    it('Pagination default is false', (done) => {
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
        server.register({
            register: require(pluginName),
            options: options
        }, (err) => {
            expect(err).to.be.undefined();

            server.inject({
                method: 'GET',
                url: '/?pagination=true'
            }, (res) => {

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
                expect(meta[names.last.name]).to.be.null();
                expect(meta[names.first.name]).to.part.include(['pagination=true']);
                expect(meta[names.self.name]).to.part.include(['pagination=true']);
                expect(response.results).to.be.an.array();
                expect(response.results).to.have.length(0);

                done();
            });
        });
    });
});

describe('Wrong options', () => {
    it('Should return an error on register', (done) => {
        const server = register();
        server.register({
            register: require(pluginName),
            options: {
                query: {
                    limit: {
                        default: 'abcd'
                    }
                }
            }
        }, (err) => {
            expect(err).to.exists();
            done();
        });
    });

    it('Should return an error on register', (done) => {
        const server = register();
        server.register({
            register: require(pluginName),
            options: {
                meta: {
                    name: 0
                }
            }
        }, (err) => {
            expect(err).to.exists();
            done();
        });
    });

    it('Should return an error on register', (done) => {
        const server = register();
        server.register({
            register: require(pluginName),
            options: {
                query: {
                    limit: {
                        default: 0
                    }
                }
            }
        }, (err) => {
            expect(err).to.exists();
            done();
        });
    });

    it('Should return an error on register', (done) => {
        const server = register();
        server.register({
            register: require(pluginName),
            options: {
                meta: {
                    totalCount: {
                        active: 'abc'
                    }
                }
            }
        }, (err) => {
            expect(err).to.exists();
            done();
        });
    });
});

describe('Empty result set', () => {

    it('Counts should be 0', (done) => {
        const server = register();
        server.register(require(pluginName), (err) => {

            expect(err).to.be.undefined();

            const request = {
                method: 'GET',
                url: '/empty'
            };

            server.inject(request, (res) => {
                const response = res.request.response.source;
                expect(response.meta.totalCount).to.equal(0);
                expect(response.meta.pageCount).to.equal(0);
                expect(response.meta.count).to.equal(0);

                done();
            });
        });
    });
});

