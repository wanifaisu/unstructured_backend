const express = require('express');
const { fetchContactsFromGHL } = require('../controllers/ghlController');

const router = express.Router();

// Endpoint to fetch and save contacts
router.get('/fetch-contacts', async (req, res) => {
    try {
        await fetchContactsFromGHL();
        res.status(200).json({ message: 'Contacts fetched and saved successfully.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;