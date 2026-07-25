'use strict';

const { configureKarma } = require('../../tools/testing/karma.shared.conf.cjs');

module.exports = (config) => configureKarma(config, 'angular-showcase');
