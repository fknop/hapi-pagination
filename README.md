# hapi-pagination

Hapi plugin to handle 'custom' resources pagination in json only (for now at
least).

## How to install

```
npm install hapi-pagination --save
```

## How to use

hapi-pagination uses EcmaScript 6. The following examples will use it as well.

By default, the plugin will listen to the `limit` and `page` query parameters
 (`request.query.limit` and `request.query.page`), you don't have to validate
 them yourself with Joi. If the page or limit  is not a number, the default
 value will be assigned instead. You can override this behavior (see below).

You can pass to the `register` method an `options` object. You can change the
 names of the default query parameters, the meta generated in the JSON response.

For this to work, the response send with the `reply` method must be an array.

To have certain attributes in the meta object, you have to expose a
`totalCount` (with the name you chose in the options) attribute to the `request` object. 

Alternatively, since 1.1.0, you can use reply.paginate(Array, [totalCount])
(totalCount being optional). This will expose for you the results and the
totalCount. The name of this method can also be modified (see below).

If totalCount is not exposed through the request object 
or the reply.paginate method, the following attributes will be
set to null if they are active.
 * last
 * pageCount
 * totalCount
 * next

You can still have these four attributes by exposing totalCount even if
totalCount is set to false.

The default options are:

```javascript
const options = {
    query: {
        // The page (accessed by request.query.page if page.name === 'page')
        page: {
            name: 'page',
            default: 1 // page default value
        },
        // The limit (accessed by request.query.limit if page.limit === 'limit')
        limit: {
            name: 'limit',
            default: 25 // limit default value
        },
		invalid: 'defaults' // 'defaults': set defaults value if invalid,
							// 'badRequest': send 400 badRequest if invalid
    },

    // The meta object generated along the results
    meta: {
        name: 'meta', // The name of the meta object
        // The number of rows returned
        count: {
            active: true,
            name: 'count'
        },

        // The total number of rows
        totalCount: {
            active: true,
            name: 'totalCount'
        },

        // the number of pages
        pageCount: {
            active: true,
            name: 'pageCount'
        },

        // The url linking to the same page of the resources returned
        self: {
            active: true,
            name: 'self'
        },

        // The url linking to the previous page of the resources returned
        previous: {
            active: true,
            name: 'previous'
        },

        // The url linking to the next page of the resources returned
        next: {
            active: true,
            name: 'next'
        },

        // The url linking to the first page of the resources returned
        first: {
            active: true,
            name: 'first'
        },

        // The url linking to the last page of the resources returned
        last: {
            active: true,
            name: 'last'
        },

        // The current page
        page: {
            active: false,
            // name == default.query.page.name
        },

        // The current limit
        limit: {
            active: false
            // name == default.query.limit.name
        }

    },

    // The results (array of rows) returned by the reply method
    results: {
        name: 'results'
    },
	reply: {
		paginate: 'paginate' // The name of the paginate method, by default: reply.paginate
	},

    // The routes concerned by the pagination
    routes: {
        include: ['*'],
        exclude: [], // useful if include is *

        // Overrides default values of specified routes.
        // Must be specified in include (or *)
        override: [{
            routes: [],
            limit: 25,
            page: 1
        }]
    }
};
```


### Simple example

```javascript
const Hapi = require('hapi');

let server = new Hapi.Server();

// Add your connection

server.register(require('hapi-pagination'), (err) => {
    if (err)
        throw err;
});
```

### Example with options

```javascript
const Hapi = require('hapi');

let server = new Hapi.Server();

// Add your connection

const options = {
    query: {
      page: {
        name: 'the_page' // The page parameter will now be called the_page
      },
      limit: {
        name: 'per_page', // The limit will now be called per_page
        default: 10       // The default value will be 10
      }
    },
     meta: {
        name: 'metadata', // The meta object will be called metadata
        count: {
            active: true,
            name: 'count'
        },
        pageCount: {
            name: 'totalPages'
        },
        self: {
            active: false // Will not generate the self link
        },
        first: {
            active: false // Will not generate the first link
        },
        last: {
            active: false // Will not generate the last link
        }
     },
     routes: {
         include: ['/users', '/accounts', '/persons', '/'],

         // Overrides default values of specified routes.
         // Must be specified in include (or *)
         override: [{
             // Overrides default values for routes '/accounts' and '/persons'
             routes: ['/accounts', '/persons'],
             limit: 25,
             page: 1
         }, { / Overrides default values for route '/'
            routes: ['/'],
            limit: 100,
            page: 1
         }]
     }
};

server.register({register: require('hapi-pagination'), options: options}, (err)
=> {
    if (err)
        throw err;
});
```

## Tests

Make sure you have `lab` and `code` installed and run :

```
npm test
```

## Contribute

Post an issue if you encounter a bug or an error in the documentation.

