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

const register = () => {
    let server = new Hapi.Server();
    server.connection();
    server.route({
        method: 'GET',
        path: '/',
        handler: (request, reply) => reply('ok')
    });

    return server;
}

describe('defaults-test', () => {
    it('Test if limit default is added to request object', (done) => {
        let server = register();
        server.register(require('../'), (err) => {
            expect(err).to.be.empty;

            let request = {
                method: 'GET',
                url: '/'
            };

            server.inject(request, (res) => {
                expect(res.request.query.limit).to.equal(25);
                done();
            });
        });
    });
});
