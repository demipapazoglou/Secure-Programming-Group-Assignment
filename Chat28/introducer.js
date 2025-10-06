const fs = require('fs');
const yaml = require('js-yaml');

const { address } = require("./ws");

let connectedIntroducer = false;
let bootstrapServers;

const server_id = "chat_28";
const serverList = [];

function connectServers() {
	parseBootstrapServers();
	connectToIntroducer();
	if (connectedIntroducer)
	{
		openCommunications();
		sendServerAnnouncement();
		return (true);
	}
	return (false);
}

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
					try {
						connectedIntroducer = true;
						server_id = data.payload.assigned_id;
						serverList = data.payload.clients;
					}
					catch {
						connectedIntroducer = false;
					}
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

function openCommunications() {
	const socket = new WebSocket("ws://localhost:433");

	socket.addEventListener("open", (event) => {
		console.log(socket.remo)
	});

	socket.addEventListener("message", (event) => {
		const data = JSON.parse(event.data);
		if (data.type)
			parseMessages(data);
	});
}

function sendServerAnnouncement() {
	for (i = 0; i < serverList.length; i++)
	{
		try {
			var ipString = serverList[i].host + ":" + serverList[i].port;
			var server = new WebSocket("ws://" + ipString);

			server.onopen = function(open) {
  				server.send(JSON.stringify({
					"type":"SERVER_ANNOUNCE",
					"from":server_id,
					"to":serverList[i].user_id,
					"ts":1700000000000,
					"payload":{
						"host":address,
						"port":433,
						"pubkey":bootstrapServers[i].pubkey
					},
					"sig":"..."
				}));
			}
		}
		catch {
			console.log("Failed to connect to external Server.");
			continue;
		}
	}
}

function parseMessages(message) {
	switch (message.type)
	{
		case "SERVER_ANNOUNCE":
			try {
				serverList.push({
					"user_id": message.from,
					"host": message.payload.host,
					"port": message.payload.port,
					"pubkey": message.payload.pubkey
				});
			}
			catch {
				break;
			}
			break;
		default:
			break;
	}
}

module.exports = { connectServers };