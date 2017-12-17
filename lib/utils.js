'use strict';

// Some functions to replace lodash
module.exports = exports = {

    isNil(value) {

        return typeof value === 'undefined' || value === null;
    },

    isUndefined(value) {

        return typeof value === 'undefined';
    },

    some(collection, predicate) {

        let bool = false;
        let index = -1;

        while (++index < collection.length && !bool) {
            bool = predicate(collection[index], index, collection);
        }

        return bool;
    },

    map(collection, fn) {

        const result = [];
        for (const element of collection) {
            result.push(fn(element));
        }

        return result;
    },

    // No need to check if a number, always used after a parse int (for now)
    isNaN(value) {

        return value !== +value;
    }
};
