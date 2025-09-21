const express = require("express");
const jwt = require("jsonwebtoken");

module.exports = function (dbManager) {
  const router = express.Router();

  // Get profile
  router.get("/", async (req, res) => {
    const auth = req.headers["authorization"];
    if (!auth) return res.status(401).json({ message: "No token" });

    try {
      const token = auth.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Use user_id (UUID) 
      const user = await dbManager.getUserByIdentifier(decoded.user_id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (err) {
      console.error(err);
      res.status(401).json({ message: "Invalid token" });
    }
  });

  // Update profile
  router.post("/", async (req, res) => {
    const auth = req.headers["authorization"];
    if (!auth) return res.status(401).json({ message: "No token" });

    try {
      const token = auth.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const { displayName, status } = req.body;

      // need to add an updateUser method to DatabaseManager
      const result = await dbManager.updateUserMeta(decoded.user_id, {
        display_name: displayName,
        status: status
      });

      if (result) {
        res.json({ message: "Profile updated" });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (err) {
      console.error(err);
      res.status(401).json({ message: "Invalid token" });
    }
  });

  return router;
};