// tests/setup.js
const { loadConfig } = require('../src/config');

module.exports = async () => {
    await loadConfig();
};