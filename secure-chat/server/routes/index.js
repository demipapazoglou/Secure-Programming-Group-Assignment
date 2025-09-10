var express = require('express');
var router = express.Router();

/* GET LOGIN page. */
router.get('/', function(req, res) {
  res.redirect('/login.html');
});

module.exports = router;
