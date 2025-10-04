/**
 * Chat28
 * Group: UG 28
 * Students: Samira Hazara | Demi Papazoglou | Caitlin Joyce Martyr | Amber Yaa Wen Chew | Grace Baek 
 * Course: COMP SCI 3307
 * Assignment: Advanced Secure Protocol Design, Implementation and Review
 */

const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
require("dotenv").config();

const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const profileRouter = require("./routes/profile");
const authRouter = require("./routes/auth");

// Import WebSocket initialiser
const { initialiseWebSocket } = require("./ws");

const app = express();

// ---------- VIEWS ----------
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// ---------- MIDDLEWARE ----------
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// ---------- STATIC FILES ----------
app.use(express.static(path.join(__dirname, "public")));

// ---------- ROUTES ----------
app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/profile", profileRouter);
app.use("/api/auth", authRouter);

// ---------- ERROR HANDLING ----------
app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  res.status(err.status || 500);
  res.render("error");
});

// ---------- START SERVER ----------
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// ---------- INITIALISE WEBSOCKET ----------
initialiseWebSocket(server);

module.exports = app;