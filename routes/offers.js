const express = require("express");
const db = require("../db"); // Import database connection
const router = express.Router();
// GET API to fetch offers by contact_id
router.get("/offers/:contact_id", async (req, res) => {
  const { contact_id } = req.params; // Extract contact_id from the URL

  try {
    // Query the database to fetch offers for the given contact_id
    const [offers] = await db.query(
      "SELECT * FROM Offers WHERE contact_id = ?",
      [contact_id]
    );

    // If no offers are found, return a 404 error
    if (offers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No offers found for the given contact ID",
      });
    }

    // Return the offers data
    res.status(200).json({ success: true, offers });
  } catch (error) {
    console.error("Error fetching offers:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});
module.exports = router;
