const fs = require('fs');
const yaml = require('js-yaml');

let bootstrapServers;

function parseBootstrapServers() {
	try {
	const fileContents = fs.readFileSync('./bootstraps.yaml', 'utf8');

	// Parse the YAML content into a JavaScript object
	const data = yaml.load(fileContents);
	bootstrapServers = data.bootstrap_servers;

	} catch (e) {
	console.error('Error reading or parsing YAML file:', e);
	}
}

module.exports = { parseBootstrapServers, bootstrapServers };