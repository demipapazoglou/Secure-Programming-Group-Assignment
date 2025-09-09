const { MongoClient } = require("mongodb");

const uri = "mongodb+srv://28_admin:UzSNxWdBjBjtohWi@28test.fphel12.mongodb.net/?retryWrites=true&w=majority&appName=28Test";
//const client = new MongoClient(uri);
var client;

class DatabaseManager {
	constructor() {

	}

	//collection is either 'users', 'messages', or 'groups'
	//should return null if user does not exist - double check this
	async getUser(username) {
	try {
		client = new MongoClient(uri);
		const database = client.db('28test');
		const collection = database.collection('users');
		const response = await collection.findOne({ 'username': username});
		return (response);
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