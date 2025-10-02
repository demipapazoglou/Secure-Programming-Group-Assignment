const createError  = require("http-errors");
const express      = require("express");
const path         = require("path");
const cookieParser = require("cookie-parser");
const logger       = require("morgan");

const indexRouter  = require("./routes/index");
const usersRouter  = require("./routes/users"); 
const authRouter  = require("./routes/auth");

const app = express();

// ---------- VIEWS ----------
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// ---------- MIDDLEWARE ----------
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public"))); // serves login.html, chat.html, css, js

// ---------- ROUTES (DB-free only here) ----------
app.use("/", indexRouter);
app.use("/api/users", usersRouter);
app.use("/api", authRouter);

// ---------- ERRORS ----------
app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error   = req.app.get("env") === "development" ? err : {};
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
