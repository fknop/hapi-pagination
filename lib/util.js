'use strict';


// Some functions to replace lodash
module.exports = exports = class Util {
    
    static isNil  (value) {
        
        return typeof value === 'undefined' || value === null;
    }
    
    static isUndefined (value) {
        
        return typeof value === 'undefined';
    }
    
    static some (collection, predicate) {
        
        let bool = false;
        let index = -1;
        
        while (++index < collection.length && !bool) {
            bool = predicate(collection[index], index, collection);
        }
        
        return bool;
    }
    
    static map (collection, fn) {
     
        const result = [];
        for (const element of collection) {
            result.push(fn(element));
        }
        
        return result;
    }
    
    static forEach (collection, fn) {
        
        for (let i = 0; i < collection.length; ++i) {
            fn(collection[i], i, collection);
        }
        
        return collection;
    }
    
    // No need to check if a number, always used after a parse int (for now)
    static isNaN (value) {
        
        return value != +value;
    }
    
}