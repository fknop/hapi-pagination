'use strict';

const Code = require('code');
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const Hapi = require('hapi');

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

const register = () => {
	return new Promise((resolve) => {
		const server = new Hapi.Server();

		const connectionOne = server.connection({
			host: 'localhost',
			port: 0,
			labels: ['connection1']
		});

		const connectionTwo = server.connection({
			host: 'localhost',
			port: 0,
			labels: ['connection2']
		});

		connectionOne.route({
			method: 'GET',
			path: '/users',
			handler: (request, reply) => {
				request.totalCount = 20;
				return reply(users);
			}
		});

		connectionTwo.route({
			method: 'GET',
			path: '/users2',
			handler: (request, reply) => {
				request.totalCount = 20;
				return reply(users);
			}
		});

		Promise.all([
				connectionOne.register({
					register: require(pluginName),
					options: {
						meta: {
							name: 'metaConnection1'
						},
						results: {
							name: 'connection1'
						}
					}
				}),
				connectionTwo.register({
					register: require(pluginName),
					options: {
						meta: {
							name: 'metaConnection2'
						},
						results: {
							name: 'connection2'
						}
					}
				})
			])
			.then(() => {
				resolve(server);
			})
			.catch(() => resolve(server));
	});
};

describe('Multi Connections Tetsts', () => {

	it('Connection One', (done) => {
		register().then((server) => {
			server.select('connection1').inject({
				method: 'GET',
				url: '/users'
			}, (res) => {
				expect(res.request.response.source.connection1).to.be.an.array();
				expect(res.request.response.source.connection1).to.have.length(20);
				expect(res.request.response.source.metaConnection1.totalCount).to.equal(20);

				done();
			});
		});
	});

	it('Connection Two', (done) => {
		register().then((server) => {
			server.select('connection2').inject({
				method: 'GET',
				url: '/users2'
			}, (res) => {
				expect(res.request.response.source.connection2).to.be.an.array();
				expect(res.request.response.source.connection2).to.have.length(20);
				expect(res.request.response.source.metaConnection2.totalCount).to.equal(20);

				done();
			});
		});
	});

});