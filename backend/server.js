const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios'); // Import axios

const app = express();
const dbPath = path.resolve(__dirname, 'cdp_database.db');

// --- PASTE YOUR GOOGLE SHEETS URL HERE ---
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbzpVe4RfxOzBk1vJWqx11e8SyoKsGQdytINSvg2Mpga0nM9mV7siipEhRx7Gsc_FZWL/exec';

// --- SQLite Database Setup ---
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS registrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            phone TEXT NOT NULL,
            location TEXT NOT NULL,
            registeredAt TEXT NOT NULL
        )`);
    }
});

// --- Middleware ---
app.use(cors());
app.use(bodyParser.json());

// --- API Routes ---
app.post('/register', (req, res) => {
    try {
        const { name, email, phone, location } = req.body;

        if (!name || !email || !phone || !location) {
            return res.status(400).json({ msg: 'Please enter all fields' });
        }

        const registeredAt = new Date().toISOString();
        const sql = `INSERT INTO registrations (name, email, phone, location, registeredAt) VALUES (?, ?, ?, ?, ?)`;

        db.run(sql, [name, email, phone, location, registeredAt], async function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ msg: 'This email address is already registered.' });
                }
                return res.status(500).send('Server Error while writing to DB');
            }
            
            const newUserId = this.lastID;
            console.log(`User registered in DB with ID: ${newUserId}`);

            // --- Send data to Google Sheets ---
            if (GOOGLE_SHEET_URL && GOOGLE_SHEET_URL !== 'https://script.google.com/macros/s/AKfycbzpVe4RfxOzBk1vJWqx11e8SyoKsGQdytINSvg2Mpga0nM9mV7siipEhRx7Gsc_FZWL/exec') {
                try {
                    const sheetData = {
                        userId: newUserId,
                        name,
                        email,
                        phone,
                        location
                    };
                    await axios.post(GOOGLE_SHEET_URL, sheetData);
                    console.log(`Data for user ID ${newUserId} sent to Google Sheets.`);
                } catch (sheetError) {
                    console.error('Error sending data to Google Sheets:', sheetError.message);
                    // We don't stop the registration process, just log the error
                }
            }
            
            res.status(201).json({ 
                msg: 'Registration successful!', 
                userId: newUserId 
            });
        });

    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// --- Server Initialization ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));