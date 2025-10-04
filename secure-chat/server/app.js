require('dotenv').config(); // load secrets from .env file

var createError   = require('http-errors');
var express       = require('express');
var path          = require('path');
var cookieParser  = require('cookie-parser');
var logger        = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// ---------- VULNERABILITY FLAG ----------
// Load VULN_MODE from environment; default false if not set
const VULN_MODE = process.env.VULN_MODE === 'true';
app.locals.VULN_MODE = VULN_MODE;

// VULN_MODE available to templates (if needed)
app.use((req, res, next) => {
  res.locals.VULN_MODE = VULN_MODE;
  next();
});

// ---------- CRYPTO UTILS ----------
// these are our helper classes for RSA, signatures, etc.
var CryptoManager = require('./crypto/CryptoManager');

const cryptoManager = new CryptoManager();

// stick them into app.locals so any route or ws server can access
app.locals.cryptoManager = cryptoManager;

// ---------- DATABASE ----------
// connect to MongoDB through our DatabaseManager class
const DatabaseManager = require('./database');
const dbManager = new DatabaseManager();
app.locals.db = dbManager; // make db available everywhere

// ---------- VIEW ENGINE ----------
// we're still keeping ejs views even though most of our frontend is static
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// ---------- MIDDLEWARE ----------
// NOTE: body parsers must come *before* the /api routes, otherwise req.body will be empty
app.use(logger('dev'));                          // request logging
app.use(express.json());                         // parse JSON bodies
app.use(express.urlencoded({ extended: false }));// parse form bodies
app.use(cookieParser());                         // read cookies
app.use(express.static(path.join(__dirname, 'public'))); // serve static files (login.html, chat.html, css, js)

// ---------- AUTH ROUTES ----------
// REST endpoints for signup/login/logout (mounted after parsers)
const authRoutes = require('./routes/auth')(dbManager);
app.use('/api', authRoutes);

// ---------- ROUTES ----------
app.use('/', indexRouter);
app.use('/users', usersRouter);
// app.use('/chat', chatRouter); // commented out for now


// ---------- MESSAGES ROUTE (IDOR VULNERABILITY) ----------
const messagesRouter = require('./routes/messages');
app.use('/messages', messagesRouter);

// ---------- ERROR HANDLING ----------
// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler (will render error.ejs)
app.use(function (err, req, res, next) {
  // only show stacktrace in dev mode
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;