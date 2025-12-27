// server.js (Express backend)
const express = require('express');
const admin = require('firebase-admin');
const app = express();

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert('path/to/serviceAccountKey.json'),
  databaseURL: 'https://your-project.firebaseio.com'
});

// Sign Up
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await admin.auth().createUser({ email, password });
    await admin.auth().setCustomUserClaims(user.uid, { verified: false });
    // Send verification email
    await admin.auth().generateEmailVerificationLink(email);
    res.status(201).send({ message: 'User created, verification email sent' });
  } catch (error) {
    res.status(400).send(error.message);
  }
});

// Sign In
app.post('/signin', async (req, res) => {
  // Use Firebase client SDK on frontend for sign-in, then verify ID token on backend
  const idToken = req.body.idToken;
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    if (!decodedToken.email_verified) {
      return res.status(403).send('Email not verified');
    }
    res.send({ uid: decodedToken.uid });
  } catch (error) {
    res.status(401).send('Unauthorized');
  }
});

// Logout (handled on frontend)
 // Use firebase.auth().signOut();

// Forgot Password
app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    await admin.auth().generatePasswordResetLink(email);
    res.send({ message: 'Reset link sent' });
  } catch (error) {
    res.status(400).send(error.message);
  }
});

// Email Verification (handled via link, confirm on login)
app.listen(3000, () => console.log('Server running'));