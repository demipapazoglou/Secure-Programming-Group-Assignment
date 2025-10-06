const fs = require('fs');
const yaml = require('js-yaml');

let connectedIntroducer = null;
let bootstrapServers;

const server_id = "chat_28";

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

function connectToIntroducer() {
	for (i = 0; i < bootstrapServers.length; i++)
	{
		try {
			var ipString = bootstrapServers[i].host + ":" + bootstrapServers[i].port;
			var introducer = new WebSocket("ws://" + ipString);

			introducer.onopen = function(open) {
  				introducer.send(JSON.stringify({
					"type":"SERVER_HELLO_JOIN",
					"from":server_id,
					"to":ipString,
					"ts":1700000000000,
					"payload":{
						"host":bootstrapServers[i].host,
						"port":bootstrapServers[i].port,
						"pubkey":bootstrapServers[i].pubkey
					},
					"sig":"..."
				}));
			}

			introducer.addEventListener("message", (event) => {
				const data = JSON.parse(event.data);
				if (data.type == "SERVER_WELCOME")
				{
					console.log("Connected successfully to Introducer");
					connectedIntroducer = true;
					server_id = data.payload.assigned_id;
				}
			});
		}
		catch {
			console.log("Failed to connect to Introducer; Trying next server.");
			continue;
		}
		finally {
			if (connectedIntroducer)
				break;
		}
	}
	if (!connectedIntroducer)
		console.log("Failed to connect to Introducer; Running on sole local server instance.");
}

module.exports = { parseBootstrapServers, connectToIntroducer };