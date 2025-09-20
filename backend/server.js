const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config(); // Use environment variables

const app = express();

// --- PASTE YOUR GOOGLE SHEETS URL HERE ---
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbzpVe4RfxOzBk1vJWqx11e8SyoKsGQdytINSvg2Mpga0nM9mV7siipEhRx7Gsc_FZWL/exec';

// --- MongoDB Connection ---
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => console.log('Successfully connected to MongoDB Atlas.'))
    .catch(err => console.error('Error connecting to MongoDB:', err.message));

// --- User Schema and Model ---
const RegistrationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    location: { type: String, required: true },
    registeredAt: { type: Date, default: Date.now }
});

const Registration = mongoose.model('Registration', RegistrationSchema);

// --- Middleware ---
app.use(cors());
app.use(bodyParser.json());

// --- API Routes ---
app.post('/register', async (req, res) => {
    try {
        const { name, email, phone, location } = req.body;

        if (!name || !email || !phone || !location) {
            return res.status(400).json({ msg: 'Please enter all fields' });
        }

        const existingUser = await Registration.findOne({ email: email });
        if (existingUser) {
            return res.status(409).json({ msg: 'This email address is already registered.' });
        }

        const newUser = new Registration({ name, email, phone, location });
        const savedUser = await newUser.save();
        console.log(`User registered in DB with ID: ${savedUser._id}`);

        if (GOOGLE_SHEET_URL && GOOGLE_SHEET_URL !== 'PASTE_YOUR_WEB_APP_URL_HERE') {
            try {
                await axios.post(GOOGLE_SHEET_URL, {
                    userId: savedUser._id.toString(),
                    name,
                    email,
                    phone,
                    location
                });
                console.log(`Data for user ID ${savedUser._id} sent to Google Sheets.`);
            } catch (sheetError) {
                console.error('Error sending data to Google Sheets:', sheetError.message);
            }
        }
        
        res.status(201).json({ 
            msg: 'Registration successful!', 
            userId: savedUser._id 
        });

    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// --- Server Initialization ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));