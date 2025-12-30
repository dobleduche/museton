// server.js (Express backend)
const express = require('express');
const admin = require('firebase-admin');
const { GoogleGenAI, Type } = require('@google/genai'); // Import Gemini SDK

const app = express();
app.use(express.json()); // Middleware to parse JSON request bodies

// Initialize Firebase Admin (assuming serviceAccountKey.json path is correct for your environment)
admin.initializeApp({
  credential: admin.credential.cert('./path/to/serviceAccountKey.json'), // <--- UPDATE THIS PATH
  databaseURL: 'https://your-project.firebaseio.com' // <--- UPDATE THIS URL
});

// Initialize Gemini AI on the server (using env var for API key)
// This assumes process.env.API_KEY is configured in your server's environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const FREE_TIER_LIMIT = 3; // Server-side enforcement of free tier messages

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

// NEW AI CHAT ENDPOINT
app.post('/api/ai/chat', async (req, res) => {
  const { tutor, chatHistory, userMessage, isPro } = req.body;

  if (!tutor || !userMessage || !chatHistory) {
    return res.status(400).json({ message: 'Missing required chat parameters.' });
  }

  // Server-side Free Tier Enforcement
  const userMessageCount = chatHistory.filter(m => m.role === 'user').length;
  if (!isPro && userMessageCount >= FREE_TIER_LIMIT) {
    return res.status(429).json({ message: `Free session limit reached (${FREE_TIER_LIMIT} questions). Upgrade to Pro for unlimited access.` });
  }

  try {
    const systemInstruction = `
      You are ${tutor.name}, a world-class music tutor specializing in ${tutor.specialty.join(', ')}.
      Your teaching style is ${tutor.rate === '$$$' ? 'sophisticated and strict' : 'casual and encouraging'}.
      Location: ${tutor.location}.
      Keep responses concise (under 50 words) and actionable.
      You are an AI, but use the persona of ${tutor.name}.
    `;

    // Map chat history to Gemini's expected format
    const contents = chatHistory.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
    // Add the current user message
    contents.push({ role: 'user', parts: [{ text: userMessage }] });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Appropriate model for conversational text
      contents: contents,
      config: { systemInstruction }
    });

    const aiResponseText = response.text;
    if (!aiResponseText) {
      return res.status(500).json({ message: 'AI returned an empty response.' });
    }

    res.json({ text: aiResponseText });

  } catch (error) {
    console.error('Gemini API Error on backend:', error);
    if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      return res.status(429).json({ message: 'API Quota Exceeded. Please try again later or upgrade to Pro.' });
    }
    if (error.message?.includes('API_KEY')) {
      return res.status(500).json({ message: 'Backend API Key not configured correctly.' });
    }
    res.status(500).json({ message: 'Internal server error processing AI request.' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));