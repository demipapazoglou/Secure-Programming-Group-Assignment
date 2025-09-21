const express = require("express");
const path = require("path");
const router = express.Router();

// Landing → redirect to login
router.get("/", (req, res) => {
  res.redirect("/login.html");
});

// optional helpers 
router.get("/chat", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "chat.html"));
});

router.get("/profile", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "profile.html"));
});

module.exports = router;
