// Trigger Vercel rebuild to apply zero-config layout
// Node 18+ is required as global fetch is used for Firebase Auth REST requests.
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const fs = require('fs');

// Load local .env file manually if running locally and file exists
try {
    const dotenvPath = __dirname + '/../.env';
    if (fs.existsSync(dotenvPath)) {
        const envData = fs.readFileSync(dotenvPath, 'utf8');
        envData.split('\n').forEach(line => {
            line = line.trim();
            if (!line) return;
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
            if (match) {
                const key = match[1];
                let value = (match[2] || '').trim();
                // Remove surrounding quotes if present
                if (value.length > 0 && (value.charAt(0) === '"' || value.charAt(0) === "'")) {
                    value = value.substring(1, value.length - 1);
                }
                process.env[key] = value;
            }
        });
    }
} catch (envErr) {
    console.warn('Unable to parse local .env file:', envErr.message);
}

const app = express();
const PORT = 3000;

// Enable CORS so the static frontend can communicate with the backend
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

let db = null;
let isFirebaseConfigured = false;
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

// Initialize Firebase Admin SDK if service account is provided in environment variables
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        db = admin.firestore();
        isFirebaseConfigured = true;
        console.log('Firebase Cloud Firestore successfully initialized.');
    } catch (err) {
        console.error('Firebase initialization error:', err.message);
    }
} else {
    console.warn('[WARNING] FIREBASE_SERVICE_ACCOUNT environment variable is missing.');
}

if (!FIREBASE_API_KEY) {
    console.warn('[WARNING] FIREBASE_API_KEY environment variable is missing. Authentication requests will fail.');
}

// Helper to secure user profiles in Cloud Firestore
async function secureUserProfile(uid, username, email) {
    if (!isFirebaseConfigured || !db) return null;
    
    const userRef = db.collection('users').doc(uid);
    const doc = await userRef.get();
    
    const role = 'student';
    
    const profile = {
        uid,
        username,
        email,
        role,
        lastLogin: new Date().toISOString()
    };
    
    if (!doc.exists) {
        profile.createdAt = new Date().toISOString();
        await userRef.set(profile);
        console.log(`[FIRESTORE] Created new user profile for UID: ${uid} (${role})`);
    } else {
        await userRef.update({ lastLogin: profile.lastLogin });
        console.log(`[FIRESTORE] Updated login timestamp for UID: ${uid}`);
    }
    
    return { ...doc.data(), ...profile };
}

// Login API endpoint using Firebase Authentication REST API
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Username and password are required.'
        });
    }

    if (!isFirebaseConfigured || !FIREBASE_API_KEY) {
        return res.status(500).json({
            success: false,
            message: 'Firebase is not fully configured on the server. Please verify your environment variables.'
        });
    }

    // Map username to a valid university email format if it is not already an email
    const email = username.includes('@') ? username.trim() : `${username.trim()}@amrita.edu`;

    try {
        // Authenticate against Firebase Auth using the REST API
        const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;
        const authResponse = await fetch(authUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password,
                returnSecureToken: true
            })
        });

        const authData = await authResponse.json();

        if (!authResponse.ok) {
            console.warn(`[AUTH FAILED] Login failed for email "${email}": ${authData.error?.message || 'Unknown error'}`);
            return res.status(401).json({
                success: false,
                message: 'Authentication failed: Invalid credentials or account locked.'
            });
        }

        const uid = authData.localId;
        
        // Securely write user profile data to Firestore
        const userProfile = await secureUserProfile(uid, username, email);

        console.log(`[AUTH SUCCESS] User logged in securely: ${email} (${userProfile?.role || 'student'})`);
        
        return res.status(200).json({
            success: true,
            message: 'Authentication successful.',
            user: {
                uid,
                username,
                email,
                role: userProfile?.role || 'student'
            },
            idToken: authData.idToken
        });

    } catch (err) {
        console.error('[API ERROR] Secure login pipeline failed:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Server error authenticating credentials.'
        });
    }
});

// Registration API endpoint using Firebase Admin SDK
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Username and password are required.'
        });
    }

    if (!isFirebaseConfigured || !db) {
        return res.status(500).json({
            success: false,
            message: 'Firebase is not fully configured on the server. Please verify your environment variables.'
        });
    }

    // Map username to a valid university email format if it is not already an email
    const email = username.includes('@') ? username.trim() : `${username.trim()}@amrita.edu`;

    try {
        // Create user in Firebase Auth using the Admin SDK
        const userRecord = await admin.auth().createUser({
            email,
            password
        });

        const uid = userRecord.uid;

        // Create Firestore profile
        const userRef = db.collection('users').doc(uid);
        const profile = {
            uid,
            username: username.trim(),
            email,
            role: 'student',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };
        await userRef.set(profile);

        console.log(`[AUTH SUCCESS] User registered successfully: ${email}`);

        return res.status(201).json({
            success: true,
            message: 'Account created successfully.'
        });
    } catch (err) {
        console.error('[API ERROR] Registration failed:', err.message);
        if (err.code === 'auth/email-already-exists') {
            return res.status(409).json({
                success: false,
                message: 'Registration failed: Email address already registered.'
            });
        }
        return res.status(500).json({
            success: false,
            message: err.message || 'Server error creating account.'
        });
    }
});

// Admin API endpoint to retrieve registered users' safe metadata (no passwords!)
app.get('/api/admin/users', async (req, res) => {
    if (!isFirebaseConfigured || !db) {
        return res.status(500).json({
            success: false,
            message: 'Firebase Database is not active.'
        });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized: Missing or invalid token.'
        });
    }

    const token = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        const uid = decodedToken.uid;

        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists || userDoc.data().role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: Access is restricted to administrators only.'
            });
        }

        const snapshot = await db.collection('users').get();
        const usersList = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Safeguard: explicitly select only non-sensitive profile metadata
            usersList.push({
                uid: data.uid,
                username: data.username,
                email: data.email,
                role: data.role || 'student',
                createdAt: data.createdAt || data.lastLogin
            });
        });
        
        // Sort by registration/last login time
        usersList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return res.status(200).json({
            success: true,
            data: usersList
        });
    } catch (err) {
        console.error('[AUTH/FIRESTORE ERROR] Verification failed:', err.message);
        if (err.code && err.code.startsWith('auth/')) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: Invalid or expired token.'
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve registered users from database.'
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
