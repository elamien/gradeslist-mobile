const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for .cjs files and improve resolver for CommonJS modules
config.resolver.assetExts.push('cjs');
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Ensure proper resolution for node modules used in React Native
config.resolver.alias = {
  ...config.resolver.alias,
  // Ensure Cheerio uses the right version
  'cheerio': 'cheerio/lib/cheerio.js'
};

module.exports = config;