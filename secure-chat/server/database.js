const { MongoClient } = require("mongodb");

const uri = "mongodb+srv://28_admin:UzSNxWdBjBjtohWi@28test.fphel12.mongodb.net/?retryWrites=true&w=majority&appName=28Test";
var client;

class DatabaseManager {
	constructor() {

	}

	// returns null if user does not exist
	// use then to resolve promise:
	// eg: dbManager.getUsername("test2").then(function(value) {console.log(value)});
	async getUser(username) {
	try {
		client = new MongoClient(uri);
		const database = client.db('28test');
		const users = database.collection('users');
		const query = await users.findOne({ 'username': username });
		return(query);
	} finally {
		await client.close();
	}
	}

	//userDetails should be an object already
	async addUser(userDetails) {
	try {
		client = new MongoClient(uri);
		const database = client.db('28test');
		const collection = database.collection('users');
		if (await collection.findOne({'username': userDetails.username}) != null)
			return (null); //user already exists ?
		collection.insertOne(userDetails, function(err, res) {
    		if (err) throw err;
    		database.close();
  		});
	}
	finally {
		await client.close();
	}
	}
}

module.exports = DatabaseManager;