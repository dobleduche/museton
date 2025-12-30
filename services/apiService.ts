// services/apiService.ts

import { Tutor } from "../types";

const API_BASE_URL = '/api'; // This will proxy to your Node.js/Express backend

/**
 * Sends a chat message to the AI tutor via the backend API.
 * The backend handles the Gemini API call and rate limiting.
 * @param tutor The active tutor's profile.
 * @param chatHistory The current array of messages in the chat.
 * @param userMessage The new message from the user.
 * @param isPro Boolean indicating if the user has a Pro subscription.
 * @returns A promise resolving to the AI's response text.
 */
export const sendChatMessage = async (
    tutor: Tutor, 
    chatHistory: { role: 'user' | 'model', text: string }[], 
    userMessage: string, 
    isPro: boolean
): Promise<{text: string}> => {
    const response = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tutor, chatHistory, userMessage, isPro }),
    });

    if (!response.ok) {
        // Attempt to parse error message from backend
        let errorData;
        try {
            errorData = await response.json();
        } catch (parseError) {
            errorData = { message: `Server error: ${response.status} ${response.statusText}` };
        }
        throw new Error(errorData.message || 'Failed to get AI response from backend.');
    }
    return response.json(); // Expected: { text: string }
};

// Placeholder for other future AI API calls that will be proxied
// export const analyzeMusicQueryBackend = async (query: string, settings: MusicalSettings) => { /* ... */ };
// export const generateBeatStructureBackend = async (prompt: string) => { /* ... */ };
// ... etc.
