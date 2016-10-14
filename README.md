# hapi-pagination

[![NPM Version](https://img.shields.io/npm/v/hapi-pagination.svg)](https://npmjs.org/package/hapi-pagination)
[![Build Status](https://travis-ci.org/fknop/hapi-pagination.svg)](https://travis-ci.org/fknop/hapi-pagination)
[![Coverage Status](https://coveralls.io/repos/fknop/hapi-pagination/badge.svg?branch=master&service=github)](https://coveralls.io/github/fknop/hapi-pagination?branch=master)
[![Dependency Status](https://david-dm.org/fknop/hapi-pagination.svg)](https://david-dm.org/fknop/hapi-pagination)
[![bitHound Overalll Score](https://www.bithound.io/github/fknop/hapi-pagination/badges/score.svg)](https://www.bithound.io/github/fknop/hapi-pagination)

Hapi plugin to handle 'custom' resources pagination in json only.

## How to install

```
npm install hapi-pagination --save
```

## Contribute

Post an issue if you encounter a bug or an error in the documentation.
Create a new pull request if you want to add a new functionality or do any change that might get the plugin better.

I'm looking for new ideas to make the plugin better, if you have any, post an issue !

The plugin is supporting get method only for now, tell me if you need it tu support other methods too.

## CHANGELOG

Check the release log: https://github.com/fknop/hapi-pagination/releases

## How to use

Note: If you're reading this on npm, the README may not be up to date.

The plugin works with settings that you can override. You can override the
default value of a setting and even the default name. It allows you to customize
your calls to your API to suit your needs.

### Options

See the default options object below.

#### The query parameters

The plugin accepts query parameters to handle the pagination, you can customize
these parameters with the following options:

* `limit`: The number of resources by page. Default value is 25, default name is
  limit.
* `page`: The number of the page that will be returned. Default value is 1,
  default name is page.
* `pagination`: Allows you to enable, disable pagination for one request. Default
  value is true (enabled), default name is pagination.
* `invalid`: This is `NOT` a query parameter, but it allows you to customize the
  behavior if the validation of limit and page fails. By default, it sets the
  defaults, you can set it to 'badRequest' that will send you a `400 - Bad
  Request`.

Notes:
* You can access to limit, page and pagination in the handler method through `request.query`.
* If the pagination is set to false, the metadata object will not be a part of
  the response but the `pagination` parameter will still be accessible through
  `request.query`

#### The metadata

The plugin will generate a metadata object alongside your resources, you can
customize this object with the following options:


* `name`: The name of the metadata object. Default is 'meta'.
* `baseUri`: The base uri for the generated links. Default is ''.
* `count`: The number of rows returned. Default name is count. Enabled by default.
* `totalCount`: The total numbers of rows available. Default name is totalCount.
  Enabled by default.
* `pageCount`: The total number of pages available. Default name is pageCount,
  enabled by default.
* `self`: The link to the requested page. Default name is self, enabled by
  default.
* `previous`: The link to the previous page. Default name is previous, enabled by
  default. null if no previous page is available.
* `next`: Same than previous but with next page.
* `first`: Same than previous but with first page.
* `last`: Same than previous but with last page.
* `page`: The page number requested. Default name is page, disabled by default.
* `limit`: The limit requested. Default name is limit, disabled by default.

#### The results

* `name`: the name of the results array, results by default.
* `reply`: Object with:
    + `paginate`: The name of the paginate method (see below), paginate by
    default.

#### The routes

* `include`: An array of routes that you want to include, support \* and regex.
  Default to '\*'. 
* `exclude`: An array of routes that you want to exclude. Useful when include is
  '\*'. Default to empty array. Support regex.

#### Override on route level

You can override the page, limit, and pagination default value on route level.
You can also force enable or disable the pagination on a route level. This is
useful when you're using regex for example.


```javascript
config: {
  plugins: {
    pagination: {
      // enabled: boolean - force enable or force disable 
      defaults: {
        // page: override page
        // limit: override limit
        // pagination: override if pagination is false or true by
        // default
      }
    }
  }
}
```

#### reply.paginate(Array|Object, [totalCount], [options = {}])

The method is an helper method. This is a shortcut for:

```javascript
reply({results: results, totalCount: totalCount});
```

You can change names of fields (`results`, `totalCount`) using reply options.
```
reply: {
  results: {
    name: 'rows'
  },
  totalCount: {
    name: 'count'
  }
}
```

You can also reply the array and set the totalCount by adding the totalCount
(with whatever name you chose) to the request object.

```
request.totalCount = 10;
reply(results);
```

The `paginate` method also offers a way to add custom properties to your response. You just have to
pass an object as first parameter and pass a `options.key` parameter which is the name of the key of the paginated results.

For example:

```
return reply.paginate({ results: [], otherKey: 'value', otherKey2: 'value2' }, 0, { key: 'results' });
```

The response will also contains `otherKey` and `otherKey2`. Nested keys for the paginated results are not allowed.
 
If you pass an object but forgot to pass a key for your results, the paginate method will throw an error. Same thing if the key does not exist.

##### WARNING: If the results is not an array, the program will throw an implementation error.

If totalCount is not exposed through the request object
or the reply.paginate method, the following attributes will be
set to null if they are active.
 * `last`
 * `pageCount`
 * `totalCount`
 * `next`

You can still have those four attributes by exposing totalCount even if
totalCount is set to false.

#### The defaults options

```javascript
const options = {
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
      default: true
    }
        invalid: 'defaults'
    },

    meta: {
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
        first: {
            active: true,
            name: 'first'
        },
        last: {
            active: true,
            name: 'last'
        },
        page: {
            active: false,
            // name == default.query.page.name
        },
        limit: {
            active: false
            // name == default.query.limit.name
        }
    },

    results: {
      name: 'results'
    },
    reply: {
        paginate: 'paginate'
        results: {
          name: 'results'
        },
        totalCount:{
          name: 'totalCount'
        }
    },
    
    routes: {
        include: ['*'],
        exclude: []
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
     }
};

server.register({register: require('hapi-pagination'), options: options}, (err)
=> {
    if (err)
        throw err;
});
```
### Disable globally and activate pagination on specific routes

Global configuration:

```javascript
const Hapi = require('hapi');

let server = new Hapi.Server();

// Add your connection

const options = {
    enabled: false,
     routes: {
         include: [],  // Emptying include list will disable pagination
     }
};

server.register({register: require('hapi-pagination'), options: options}, (err)
=> {
    if (err)
        throw err;
});
```
Activate on route level:

```javascript
config: {
    plugins: {
        pagination: {
            enabled: true
        }
    }
}
```
If you want to provide more examples, I'll accept a PR.

### Usage with Joi (route data validation)

You have two choices when you uses this plugin with Joi:

* You can simply add the `limit`, `page` and `pagination` to the query schema (with the names that you chose !).
* You can set the `allowUnknown` option to true.
  [See here](https://github.com/hapijs/joi/blob/master/API.md#validatevalue-schema-options-callback)

You don't need this if you don't need to validate anything !

#### Example

```javascript
validate: {
  query: {
    // Your other parameters ...
    limit: Joi.number.integer(),
    page: Joi.number.integer(),
    pagination: Joi.boolean()
  }
}

// OR 

validate: {
  options: {
    allowUnknown: true
  }
  query: {
    // Your other parameters...
  }
}
```

## Tests

Make sure you have `lab` and `code` installed and run :

```
npm test
```

