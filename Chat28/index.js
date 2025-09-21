#!/usr/bin/env node
require("dotenv").config();

const http = require("http");
const app  = require("./app");

const { startSOCPWebSocketServer } = require("./ws");
const DatabaseManager = require("./database");
const CryptoManager   = require("./crypto/CryptoManager");

// ---------- LOCALS ----------
app.locals.db            = new DatabaseManager();
app.locals.cryptoManager = new CryptoManager();

// ---------- DB-DEPENDENT ROUTES ----------
const authRoutes    = require("./routes/auth");     
const profileRoutes = require("./routes/profile");  
const usersRoutes   = require("./routes/users");   

app.use("/api",         authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/users",       usersRoutes);    

// ---------- SERVER ----------
const port = normalizePort(process.env.PORT || "3000");
app.set("port", port);

const server = http.createServer(app);

// ---------- WS ----------
startSOCPWebSocketServer(server, app.locals);

// ---------- LISTEN ----------
server.listen(port);
server.on("error", onError);
server.on("listening", onListening);

function normalizePort(val) {
  const p = parseInt(val, 10);
  if (isNaN(p)) return val;
  if (p >= 0) return p;
  return false;
}

function onError(error) {
  if (error.syscall !== "listen") throw error;
  const bind = typeof port === "string" ? "Pipe " + port : "Port " + port;
  switch (error.code) {
    case "EACCES":    console.error(bind + " requires elevated privileges"); process.exit(1);
    case "EADDRINUSE":console.error(bind + " is already in use");            process.exit(1);
    default: throw error;
  }
}

function onListening() {
  const addr = server.address();
  console.log(`Server running at http://localhost:${addr.port}`);
}