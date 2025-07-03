const YAML = require('yamljs');
const path = require('path');

// Load file YAML đúng cách
const swaggerDocument = YAML.load(path.join(__dirname, './api-docs.yaml'));

module.exports = swaggerDocument;
