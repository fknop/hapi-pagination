'use strict';

const Code = require('code');
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const Hapi = require('hapi');

const describe = lab.describe;
const it = lab.it;
const before = lab.before;
const after = lab.after;
const expect = Code.expect;

const users = [
    {name: 'name1', username: 'username1'},
    {name: 'name2', username: 'username2'},
    {name: 'name3', username: 'username3'},
    {name: 'name4', username: 'username4'},
    {name: 'name5', username: 'username5'},
    {name: 'name6', username: 'username6'},
    {name: 'name7', username: 'username7'},
    {name: 'name8', username: 'username8'},
    {name: 'name9', username: 'username9'},
    {name: 'name10', username: 'username10'},
    {name: 'name11', username: 'username11'},
    {name: 'name12', username: 'username12'},
    {name: 'name13', username: 'username13'},
    {name: 'name14', username: 'username14'},
    {name: 'name15', username: 'username15'},
    {name: 'name16', username: 'username16'},
    {name: 'name17', username: 'username17'},
    {name: 'name18', username: 'username18'},
    {name: 'name19', username: 'username19'},
    {name: 'name20', username: 'username20'}
];

const register = () => {
    let server = new Hapi.Server();
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
        path: '/users',
        handler: (request, reply) => {
            request.totalCount = 20;
            const limit = request.query.limit;
            const page  = request.query.page;

            const offset = limit * (page - 1);
            let response = [];

            for (let i = offset; i < (offset + limit) && i < users.length; ++i)
                response.push(users[i]);

            return reply(response);
        }
    });

    return server;
};

describe('defaults-value-test', () => {
    it('Test if limit default is added to request object', (done) => {
        let server = register();
        server.register(require('../'), (err) => {

            expect(err).to.be.undefined();

            let request = {
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
        let server = register();
        server.register(require('../'), (err) => {
            expect(err).to.be.undefined();

            server.inject({method: 'GET', url: '/?param=1&paramm=2'}, (res) => {
                expect(res.request.query.param).to.equal('1');
                expect(res.request.query.paramm).to.equal('2');

                done();
            });
        });
    });

});

describe('Override default values', () => {
    it('Override default limit and page', (done) => {
        let options = {
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
        let server = register();
        server.register({register: require('../'), options: options}, (err) => {
            expect(err).to.be.undefined();

            server.inject({method: 'GET', url: '/'}, (res) => {

                let query = res.request.query;
                expect(query.limit).to.be.undefined();
                expect(query.page).to.be.undefined();

                let limit = options.query.limit;
                let page = options.query.page;
                expect(query[limit.name]).to.equal(limit.default);
                expect(query[page.name]).to.equal(page.default);

                done();
            });
        });
    });

    it('Override defaults routes with include', (done) => {
        let options = {
            routes: {
                include: ['/']
            }
        };
        let server = register();
        server.register({register: require('../'), options: options}, (err) => {

            expect(err).to.be.undefined();

            server.inject({method: 'GET', url: '/'}, (res) => {

                let query = res.request.query;
                expect(query.limit).to.equal(25);
                expect(query.page).to.equal(1);

                done();
            });
        });


    });

    it('Override defaults routes with include 2', (done) => {
        let options = {
            routes: {
                include: ['/']
            }
        };
        let server = register();
        server.register({register: require('../'), options: options}, (err) => {
            expect(err).to.be.undefined();

            server.inject({method: 'GET', url: '/users'}, (res) => {

                let query = res.request.query;
                expect(query.limit).to.be.undefined();
                expect(query.page).to.be.undefined();

                done();
            });
        });


    });

    it('Override defaults routes with exclude', (done) => {
        let options = {
            routes: {
                include: ['*'],
                exclude: ['/']
            }
        };
        let server = register();
        server.register({register: require('../'), options: options}, (err) => {
            expect(err).to.be.undefined();

            server.inject({method: 'GET', url: '/'}, (res) => {

                let query = res.request.query;
                expect(query.limit).to.be.undefined();
                expect(query.page).to.be.undefined();

                done();
            });
        });


    });

    it('Override defaults routes with exclude', (done) => {
        let options = {
            routes: {
                include: ['/users'],
                exclude: ['/']
            }
        };
        let server = register();
        server.register({register: require('../'), options: options}, (err) => {
            expect(err).to.be.undefined();

            server.inject({method: 'GET', url: '/'}, (res) => {


                let query = res.request.query;
                expect(query.limit).to.be.undefined();
                expect(query.page).to.be.undefined();

                done();
            });
        });
    });

    it('Override names of meta', (done) => {
        let options = {
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
        let server = register();
        server.register({register: require('../'), options: options}, (err) => {
            expect(err).to.be.undefined();

            server.inject({method: 'GET', url: '/'}, (res) => {

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
                expect(meta[names.first.name]).to.equal('http://localhost/?page=1&limit=25');
                expect(meta[names.self.name]).to.equal('http://localhost/?page=1&limit=25');
                expect(response.results).to.be.an.array();
                expect(response.results).to.have.length(0);

                done();
            });
        });
    });

    it('Override meta - set active to false', (done) => {
        let options = {
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
        let server = register();
        server.register({register: require('../'), options: options}, (err) => {
            expect(err).to.be.undefined();

            server.inject({method: 'GET', url: '/'}, (res) => {

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
});

describe('Override default values for / route', () => {
    const options = {
        query: {
            limit: {
                default: 10
            },
            page: {
                default: 3
            }
        },
        routes: {
            override: [
                {
                    routes: ['/'],
                    limit: 5,
                    page: 2
                }
            ]
        }
    };

    it('Test if overridden values are correct', (done) => {

        let server = register();

        server.register({register: require('../'), options: options}, (err) => {
            expect(err).to.be.undefined();

            server.inject({method: 'GET', url: '/'}, (res) => {

                expect(res.request.query.limit).to.equal(5);
                expect(res.request.query.page).to.equal(2);
                done();
            });
        });

    });

    it ('Test if default values are still correct for other routes', done => {
        let server = register();

        server.register({register: require('../'), options: options}, (err) => {
            expect(err).to.be.undefined();

            server.inject({method: 'GET', url: '/users'}, (res) => {

                expect(res.request.query.limit).to.equal(10);
                expect(res.request.query.page).to.equal(3);
                done();
            });
        });
    });
});


describe('Passing page and limit as query parameters', () => {

    let options = {
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

    it('Passing limit', done => {
        let server = register();

        server.register(require('../'), (err) => {
            expect(err).to.be.undefined();

            server.inject({method: 'GET', url: '/?limit=5'}, (res) => {
                expect(res.request.query.limit).to.equal(5);
                expect(res.request.query.page).to.equal(1);
                done();
            });
        });
    });

    it('Overriding and passing limit', done => {
        let server = register();

        server.register({register: require('../'), options: options}, (err) => {
            expect(err).to.be.undefined();

            server.inject({method: 'GET', url: '/?myLimit=7'}, (res) => {
                expect(res.request.query[options.query.limit.name]).to.equal(7);
                expect(res.request.query[options.query.page.name]).to.equal(2);
                done();
            });
        });
    });

    it('Passing page', done => {
        let server = register();

        server.register(require('../'), (err) => {
            expect(err).to.be.undefined();

            server.inject({method: 'GET', url: '/?page=5'}, (res) => {
                expect(res.request.query.page).to.equal(5);
                done();
            });
        });
    });

    it('Overriding and passing page', done => {
        let server = register();

        server.register({register: require('../'), options: options}, (err) => {
            expect(err).to.be.undefined();

            server.inject({method: 'GET', url: '/?myPage=5'}, (res) => {
                expect(res.request.query[options.query.limit.name]).to.equal(5);
                expect(res.request.query[options.query.page.name]).to.equal(5);
                done();
            });
        });
    });
});

describe('Test /users route', () => {

    it ('Test default with totalCount added to request object', done => {

        let server = register();
        server.register(require('../'), (err) => {
            expect(err).to.be.undefined();

            server.inject({method: 'GET', url: '/users?page=2&limit=5'}, (res) => {

                const response = res.request.response.source;
                const meta = response.meta;

                expect(meta).to.be.an.object();
                expect(meta.count).to.equal(5);
                expect(meta.totalCount).to.equal(20);
                expect(meta.pageCount).to.equal(4);
                expect(meta.previous).to.equal('http://localhost/users?page=1&limit=5');
                expect(meta.next).to.equal('http://localhost/users?page=3&limit=5');
                expect(meta.last).to.equal('http://localhost/users?page=4&limit=5');
                expect(meta.first).to.equal('http://localhost/users?page=1&limit=5');
                expect(meta.self).to.equal('http://localhost/users?page=2&limit=5');

                expect(response.results).to.be.an.array();
                expect(response.results).to.have.length(5);

                done();
            });
        });
    });
});
