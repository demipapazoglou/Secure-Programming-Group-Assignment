/**
 * Chat28
 * Group: UG 28
 * Students: Samira Hazara | Demi Papazoglou | Caitlin Joyce Martyr | Amber Yaa Wen Chew | Grace Baek 
 * Course: COMP SCI 3307
 * Assignment: Advanced Secure Protocol Design, Implementation and Review
 */

const express = require("express");
const path = require("path");
const router = express.Router();

require("dotenv").config();

// Landing --> redirect to login
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
