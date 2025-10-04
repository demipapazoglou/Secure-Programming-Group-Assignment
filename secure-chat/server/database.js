// const { MongoClient } = require("mongodb");

// const uri = "mongodb+srv://28_admin:UzSNxWdBjBjtohWi@28test.fphel12.mongodb.net/?retryWrites=true&w=majority&appName=28Test";
// var client;

// class DatabaseManager {
// 	constructor() {
// 		client = new MongoClient(uri);
// 	}

// 	//probs should sanitise details somewhere here at some point
// 	//figure out how file sending would work?

// 	// returns null if user does not exist
// 	// use then to resolve promise:
// 	// eg: dbManager.getUsername("test2").then(function(value) {console.log(value)});
// 	async getUser(username) {
// 		const database = client.db('28test');
// 		const users = database.collection('users');
// 		const query = await users.findOne({ 'username': username });
// 		return(query);
// 	}

// 	//userDetails should be an object already
// 	//fields: username, password, email, active
// 	async addUser(userDetails) {
// 		const database = client.db('28test');
// 		const collection = database.collection('users');
// 		if (await collection.findOne({'username': userDetails.username}) != null)
// 			return (null); //user already exists ?
// 		collection.insertOne(userDetails, function(err, res) {
//     		if (err) throw err;
//     		database.close();
//   		});
// 	}

// 	//fields: from, to, content
// 	//add file functionality later
// 	async addMessage(messageDetails) {
// 		const database = client.db('28test');
// 		const collection = database.collection('messages');
// 		const query = {
// 			'time': new Date(),
// 			'content': messageDetails.content
// 		}
// 		if (await collection.findOne({'username': messageDetails.from}) == null)
// 			return (null); //user dne
// 		if (await collection.findOne({'username': messageDetails.to}) != null)
// 			return (null); //user dne
// 		this.getUser(messageDetails.from).then(function(value) {
// 			query['from'] = value["_id"];
// 		});
// 		this.getUser(messageDetails.to).then(function(value) {
// 			query['to'] = value["_id"];
// 		});
// 		collection.insertOne(query, function(err, res) {
//     		if (err) throw err;
//     		database.close();
//   		});
// 	}

// 	//returns messages in ascending time order
// 	async getMessageFromTo(from, to) {
// 		const database = client.db('28test');
// 		const collection = database.collection('messages');
// 		const query = {};

// 		this.getUser(from).then(function(value) {
// 			if (value != null)
// 				query['from'] = value["_id"];
// 			else
// 				return(null);
// 		});
// 		this.getUser(to).then(function(value) {
// 			if (value != null)
// 				query['to'] = value["_id"];
// 			else
// 				return (null);
// 		});

// 		const result = await collection.find(query).sort({'time': 1}).toArray();
// 		console.log(result);
// 		return (result);
// 	}

// 	async endClient() {
// 		await client.close();
// 	}
// }

// module.exports = DatabaseManager;


// database.js
const { MongoClient } = require("mongodb");
const bcrypt = require("bcrypt");

class DatabaseManager {
  constructor() {
    // CHANGED: instead of hardcoding the Mongo URI in the file,
    // I now pull it from process.env (using .env file for security).
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI missing");

    // CHANGED: added maxPoolSize option so connections are reused properly
    this.client = new MongoClient(uri, { maxPoolSize: 10 });

    // CHANGED: database name also comes from env var (default fallback = "28test")
    this.dbName = process.env.MONGO_DB || "28test";

    // CHANGED: connect once in constructor, store collections for reuse
    this.ready = this.client.connect().then(async () => {
      this.db = this.client.db(this.dbName);
      this.users = this.db.collection("users");
      this.messages = this.db.collection("messages");

      // CHANGED: create indexes (unique on username/email, time index on messages)
      await this.users.createIndexes([
        { key: { username: 1 }, unique: true },
        { key: { email: 1 }, unique: true }
      ]);
      await this.messages.createIndex({ time: 1 });
    });
  }

  /* ---------- Users ---------- */

  // same idea as before, but now reuses the "this.users" handle
  async getUser(username) {
    await this.ready;
    return this.users.findOne({ username });
  }

  // CHANGED: addUser now hashes the password with bcrypt before saving
  // (your original version stored plaintext passwords).
  async addUser(userDetails) {
    await this.ready;
    const { username, email, password } = userDetails;

    // CHANGED: check both username and email for duplicates (friend’s version only checked username)
    const exists = await this.users.findOne({ $or: [{ username }, { email }] });
    if (exists) return null;

    const pass_hash = await bcrypt.hash(password, 12);
    await this.users.insertOne({
      username,
      email,
      pass_hash,
      active: true,
      createdAt: new Date()
    });

    return { username, email };
  }

  // CHANGED: helper to get by either username or email
  async getUserByIdentifier(identifier) {
    await this.ready;
    return this.users.findOne({ $or: [{ username: identifier }, { email: identifier }] });
  }

  // CHANGED: validateUser now uses bcrypt.compare instead of checking plaintext passwords
  async validateUser(identifier, password) {
    const user = await this.getUserByIdentifier(identifier);
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.pass_hash);
    return ok ? { username: user.username, email: user.email } : null;
  }

  /* ---------- Messages ---------- */

  // CHANGED: simplified addMessage
  // - before: it tried to use ObjectIds and closed the DB accidentally
  // - now: it just saves { from, to, content, time } with usernames
  async addMessage(messageDetails) {
    await this.ready;
    const { from, to, content } = messageDetails;

    // CHANGED: properly check that both users exist in users collection
    const [f, t] = await Promise.all([this.getUser(from), this.getUser(to)]);
    if (!f || !t) return null;

    await this.messages.insertOne({
      from, to, content,
      time: new Date()
    });
    return true;
  }

  // CHANGED: simplified message query
  // - before: async race conditions with then() and ObjectIds
  // - now: just query messages where (from→to) OR (to→from)
  async getMessageFromTo(from, to) {
    await this.ready;
    return this.messages
      .find({ $or: [{ from, to }, { from: to, to: from }] })
      .sort({ time: 1 })
      .toArray();
  }

  async endClient() {
    await this.client.close();
  }

  // for idor vulnerability
  // helper to fetch all messages for a given username
  // returns messages where user is either sender or recipient
  async getMessagesForUser(username) {
    await this.ready;
    return this.messages
      .find({ $or: [{ from: username }, { to: username }] })
      .sort({ time: 1 })
      .toArray();
  }
}

module.exports = DatabaseManager;
