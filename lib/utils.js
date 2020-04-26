'use strict'

// Some functions to replace lodash
module.exports = exports = {
  isNil(value) {
    return typeof value === 'undefined' || value === null
  },

  isUndefined(value) {
    return typeof value === 'undefined'
  },

  // No need to check if a number, always used after a parse int (for now)
  isNaN(value) {
    return value !== +value
  }
}
