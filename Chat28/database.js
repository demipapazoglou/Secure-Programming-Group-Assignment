// database.js
// MongoDB wrapper: users + groups per SOCP, with indexes and "public" group bootstrap

const { MongoClient } = require("mongodb");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

class DatabaseManager {
  constructor() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not set");
    this.client = new MongoClient(uri, { maxPoolSize: 10 });
    this.dbName = process.env.MONGO_DB || "secure_chat";
    this.ready = this.init();
  }

  async init() {
    await this.client.connect();
    this.db = this.client.db(this.dbName);
    this.users = this.db.collection("users");
    this.groups = this.db.collection("groups");
    this.group_members = this.db.collection("group_members");

    await this.users.createIndexes([
      { key: { user_id: 1 }, unique: true },
      { key: { username: 1 }, unique: true },
      { key: { email: 1 }, unique: true },
    ]);
    await this.groups.createIndex({ group_id: 1 }, { unique: true });
    await this.group_members.createIndex({ group_id: 1, member_id: 1 }, { unique: true });

    // Ensure a default public group exists
    const publicGroup = await this.groups.findOne({ group_id: "public" });
    if (!publicGroup) {
      await this.groups.insertOne({
        group_id: "public",
        creator_id: "system",
        created_at: Date.now(),
        meta: { title: "Public Channel", description: "Everyone can chat here" },
        version: 1,
      });
    }
  }

  // Create user (SOCP fields). Returns { user_id, username, email, pubkey } or null if exists.
  async createUser({ username, email, password, pubkey, privkey_store, pakeVerifier }) {
    await this.ready;

    const exists = await this.users.findOne({ $or: [{ username }, { email }] });
    if (exists) return null;

    const user_id = uuidv4();
    const pass_hash = await bcrypt.hash(password, 12);

    const doc = {
      user_id,
      username,
      email,
      pass_hash,         
      pubkey,            
      privkey_store,     
      pake_password: pakeVerifier || "TODO:PAKE",
      meta: { 
        joined: new Date(),
        display_name: username,
        status: "online"
      },
      version: 1,
    };

    await this.users.insertOne(doc);

    // Auto-join "public" group
    await this.addUserToGroup(user_id, "public");

    return { user_id, username, email, pubkey };
  }

  async getUserByIdentifier(identifier) {
    await this.ready;
    return this.users.findOne(
      { $or: [{ username: identifier }, { email: identifier }, { user_id: identifier }] },
      { projection: { pass_hash: 0, privkey_store: 0 } } 
    );
  }

  async validateUser(identifier, password) {
    await this.ready;
    const user = await this.users.findOne(
      { $or: [{ username: identifier }, { email: identifier }, { user_id: identifier }] }
    );
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.pass_hash);
    if (!ok) return null;
    
    // Return user without sensitive fields
    const { pass_hash, privkey_store, ...safeUser } = user;
    return safeUser;
  }

  // update user metadata
  async updateUserMeta(user_id, metaUpdates) {
    await this.ready;
    const result = await this.users.updateOne(
      { user_id },
      { 
        $set: { 
          "meta.display_name": metaUpdates.display_name,
          "meta.status": metaUpdates.status,
          "meta.updated": new Date()
        } 
      }
    );
    return result.modifiedCount > 0;
  }

  async listGroupMembers(group_id = "public") {
    await this.ready;
    const members = await this.group_members.find({ group_id }).toArray();
    return members.map(m => m.member_id);
  }

  async addUserToGroup(user_id, group_id = "public") {
    await this.ready;
    
    // Check if already a member
    const existing = await this.group_members.findOne({ group_id, member_id: user_id });
    if (existing) return true;

    // Add to group_members
    await this.group_members.insertOne({
      group_id,
      member_id: user_id,
      role: "member",
      wrapped_key: "TODO_WRAPPED_KEY", // Will implement proper key wrapping later
      added_at: Date.now()
    });

    return true;
  }

  // get all users (for /list command)
  async getAllUsers() {
    await this.ready;
    return this.users.find({}, { 
      projection: { 
        user_id: 1, 
        username: 1, 
        email: 1, 
        pubkey: 1,
        "meta.display_name": 1,
        "meta.status": 1
      } 
    }).toArray();
  }
};

module.exports = DatabaseManager;