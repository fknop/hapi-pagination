'use strict';

module.exports = {
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
            default: true,
            active: true
        },
        invalid: 'defaults'
    },
    meta: {
        location: 'body',
        successStatusCode: undefined,
        baseUri: undefined,
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
        hasNext: {
            active: false,
            name: 'hasNext'
        },
        hasPrevious: {
            active: false,
            name: 'hasPrevious'
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
        paginate: 'paginate',
        parameters: {
            results: {
                name: 'results'
            },
            totalCount: {
                name: 'totalCount'
            }
        }
    },
    routes: {
        include: ['*'],
        exclude: []
    }
};
