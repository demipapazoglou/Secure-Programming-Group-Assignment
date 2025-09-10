const { MongoClient } = require("mongodb");

const uri = "mongodb+srv://28_admin:UzSNxWdBjBjtohWi@28test.fphel12.mongodb.net/?retryWrites=true&w=majority&appName=28Test";
var client;

class DatabaseManager {
	constructor() {
		client = new MongoClient(uri);
	}

	//probs should sanitise details somewhere here at some point
	//figure out how file sending would work?

	// returns null if user does not exist
	// use then to resolve promise:
	// eg: dbManager.getUsername("test2").then(function(value) {console.log(value)});
	async getUser(username) {
		const database = client.db('28test');
		const users = database.collection('users');
		const query = await users.findOne({ 'username': username });
		return(query);
	}

	//userDetails should be an object already
	//fields: username, password, email, active
	async addUser(userDetails) {
		const database = client.db('28test');
		const collection = database.collection('users');
		if (await collection.findOne({'username': userDetails.username}) != null)
			return (null); //user already exists ?
		collection.insertOne(userDetails, function(err, res) {
    		if (err) throw err;
    		database.close();
  		});
	}

	//fields: from, to, content
	//add file functionality later
	async addMessage(messageDetails) {
		const database = client.db('28test');
		const collection = database.collection('messages');
		const query = {
			'time': new Date(),
			'content': messageDetails.content
		}
		if (await collection.findOne({'username': messageDetails.from}) == null)
			return (null); //user dne
		if (await collection.findOne({'username': messageDetails.to}) != null)
			return (null); //user dne
		this.getUser(messageDetails.from).then(function(value) {
			query['from'] = value["_id"];
		});
		this.getUser(messageDetails.to).then(function(value) {
			query['to'] = value["_id"];
		});
		collection.insertOne(query, function(err, res) {
    		if (err) throw err;
    		database.close();
  		});
	}

	//returns messages in ascending time order
	async getMessageFromTo(from, to) {
		const database = client.db('28test');
		const collection = database.collection('messages');
		const query = {};
		
		this.getUser(from).then(function(value) {
			if (value != null)
				query['from'] = value["_id"];
			else
				return(null);
		});
		this.getUser(to).then(function(value) {
			if (value != null)
				query['to'] = value["_id"];
			else
				return (null);
		});
		
		const result = await collection.find(query).sort({'time': 1}).toArray();
		console.log(result);
		return (result);
	}

	async endClient() {
		await client.close();
	}
}

module.exports = DatabaseManager;