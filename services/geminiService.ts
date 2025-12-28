
// import { GoogleGenAI, Type } from "@google/genai";
import { TheoryData, QuizQuestion, BeatProject, AudioAnalysis, MusicalSettings, PracticeSession, BackingTrack, AccompanimentStyle } from "../types";


const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GROK_MODEL = 'grok';

export async function callOpenRouter(messages: {role: string, content: string}[], options?: {max_tokens?: number, temperature?: number}) {
  const res = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROK_MODEL,
      messages,
      ...options
    })
  });
  if (!res.ok) throw new Error('OpenRouter API error: ' + res.statusText);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// --- UTILS: Robust JSON Parsing ---
const cleanAndParseJSON = <T>(text: string, fallback: T): T => {
  if (!text) return fallback;
  try {
    // Remove Markdown code blocks if present (e.g. ```json ... ```)
    let clean = text.replace(/```json\n?|```/g, '').trim();
    // Locate first '{' and last '}' to handle any preamble/postscript text
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
        clean = clean.substring(start, end + 1);
    }
    return JSON.parse(clean) as T;
  } catch (error) {
    console.warn("JSON Parse Failed, using fallback:", error);
    return fallback;
  }
};

const handleGenAIError = (error: any, fallback: any) => {
    const msg = error.toString().toLowerCase();
    if (msg.includes('429') || msg.includes('quota') || msg.includes('resource exhausted')) {
        throw new Error("API_QUOTA_EXCEEDED");
    }
    console.error("Gemini API Error (Falling back to offline mode):", error);
    return fallback;
};

// --- Core Music Theory ---
export const parseMusicQuery = async (query: string, settings?: MusicalSettings): Promise<TheoryData> => {
  const complexityPrompt = settings?.complexity === 'Advanced' 
    ? "Provide deep theoretical analysis, including jazz extensions (9ths, 13ths) and modal interchange if relevant."
    : "Keep the explanation simple, suitable for a beginner.";

  const contextPrompt = settings && settings.rootKey !== 'Auto'
    ? `If the user does not specify a root note, assume they are asking about ${settings.rootKey}.`
    : "";

  const systemPrompt = `
    You are an expert music theory engine. Return structured JSON for music visualization.
    1. Identify root, structure, correctly spelled notes, and intervals.
    2. Provide a mood and description.
    3. ${complexityPrompt}
    4. ${contextPrompt}
    Fallback to C Major if unclear.
  `;

  const fallback: TheoryData = { type: 'scale', root: 'C', name: 'C Major', notes: ['C','D','E','F','G','A','B'], intervals: ['R','2','3','4','5','6','7'], description: 'Analysis failed (Offline Mode).', mood: 'Neutral' };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: query,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ["scale", "chord", "interval", "note"] },
            root: { type: Type.STRING },
            name: { type: Type.STRING },
            notes: { type: Type.ARRAY, items: { type: Type.STRING } },
            intervals: { type: Type.ARRAY, items: { type: Type.STRING } },
            description: { type: Type.STRING },
            mood: { type: Type.STRING },
          },
          required: ["type", "root", "name", "notes", "intervals", "description"]
        }
      }
    });
    return cleanAndParseJSON(response.text!, fallback);
  } catch (error) {
    return handleGenAIError(error, fallback);
  }
};

// --- Gamification: Quiz Generation ---
export const generateDailyQuiz = async (userLevel: number, style: string): Promise<QuizQuestion> => {
  const difficulty = userLevel < 5 ? "beginner" : "advanced";
  const prompt = `Generate a multiple-choice music theory question for a ${difficulty} musician interested in ${style}. 
  Focus on factual theory, history, or ear training concepts.`;

  const fallback: QuizQuestion = { question: "Which note is the dominant in C Major?", options: ["C","F","G","B"], correctIndex: 2, xpReward: 50, explanation: "G is the 5th degree." };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } }, // 4 options
            correctIndex: { type: Type.INTEGER },
            xpReward: { type: Type.INTEGER },
            explanation: { type: Type.STRING }
          }
        }
      }
    });
    return cleanAndParseJSON(response.text!, fallback);
  } catch (error) {
    return handleGenAIError(error, fallback);
  }
};

// --- Studio: Beat Engineer (With Guardrails) ---
export const generateBeatStructure = async (query: string): Promise<BeatProject> => {
  const systemPrompt = `
    You are a professional Drum Machine Programmer AI. 
    Create a 16-step beat pattern based on the user's request.
    
    OUTPUT RULES:
    - patterns.kick, patterns.snare, etc must be arrays of 16 booleans (true = hit, false = rest).
    - Ensure the BPM fits the genre.
    
    SAFETY PROTOCOL: 
    - REJECT any requests related to hate speech or explicit violence.
  `;
  
  const fallback: BeatProject = {
    title: "Basic Beat", bpm: 120, genre: "Pop", structure: [], instruments: [], notes: "",
    patterns: { kick: [], snare: [], hat: [], clap: [] }
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Create a drum pattern for: ${query}`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            bpm: { type: Type.INTEGER },
            genre: { type: Type.STRING },
            structure: { type: Type.ARRAY, items: { type: Type.STRING } },
            instruments: { type: Type.ARRAY, items: { type: Type.STRING } },
            notes: { type: Type.STRING },
            patterns: {
              type: Type.OBJECT,
              properties: {
                kick: { type: Type.ARRAY, items: { type: Type.BOOLEAN } },
                snare: { type: Type.ARRAY, items: { type: Type.BOOLEAN } },
                hat: { type: Type.ARRAY, items: { type: Type.BOOLEAN } },
                clap: { type: Type.ARRAY, items: { type: Type.BOOLEAN } },
              },
              required: ["kick", "snare", "hat", "clap"]
            }
          },
          required: ["title", "bpm", "patterns"]
        }
      }
    });
    return cleanAndParseJSON(response.text!, fallback);
  } catch (error) {
    return handleGenAIError(error, fallback);
  }
};

// --- Identifier: SHAZAM-STYLE RECOGNITION ---
export const analyzeAudioEnvironment = async (audioBase64: string): Promise<AudioAnalysis> => {
  const fallback: AudioAnalysis = { matchFound: false, detectedGenre: "Undetected", likelyKey: "-", bpm: 0, similarArtists: ["Try a clearer recording"], globalUsageMatches: [] };
  try {
    const systemPrompt = `
      You are an advanced Music Recognition System.
      1. Listen to the audio clip. IDENTIFY THE SPECIFIC SONG (Title, Artist) if possible.
      2. If a known song is identified, set 'matchFound' to true and fill 'identifiedSong'.
      3. If no specific song is recognized, perform a deep audio analysis of the genre, key, and bpm.
      4. Detect similar artists based on timbre and style.
    `;
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Analyze this audio (base64): ${audioBase64}` }
    ];
    const content = await callOpenRouter(messages, { max_tokens: 300 });
    return cleanAndParseJSON<AudioAnalysis>(content, fallback);
  } catch (error) {
    return handleGenAIError(error, fallback);
  }
};

// --- MASTERY: Dynamic Review ---
export const generatePerformanceReview = async (
  targetNotes: string[], 
  playedNotes: { note: string, time: number }[],
  metrics: { accuracy: number, timing: number }
): Promise<Partial<PracticeSession>> => {
  
  const systemPrompt = `
    You are a Piano Master Teacher AI. 
    Analyze the user's performance metrics.
    1. Calculate a final weighted 'Overall Score'.
    2. Identify specific 'Hot Spots' (notes or transitions) where they failed.
    3. Suggest a 'Dynamic Review Drill' (e.g. Speed Ramp) to fix it.
  `;

  const inputData = JSON.stringify({
    target: targetNotes.slice(0, 5) + "...", // Context
    accuracy: metrics.accuracy,
    timing: metrics.timing,
    errorCount: Math.max(0, targetNotes.length - playedNotes.length) // Simplistic diff
  });

  const fallback: Partial<PracticeSession> = {
      metrics: { accuracy: 80, timing: 70, dynamics: 50, expression: 60, overallScore: 65 } as any,
      feedbackSummary: "Analysis unavailable, try again.",
      hotSpots: []
    };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze this practice session data: ${inputData}`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            metrics: {
              type: Type.OBJECT,
              properties: {
                accuracy: { type: Type.NUMBER },
                timing: { type: Type.NUMBER },
                dynamics: { type: Type.NUMBER },
                expression: { type: Type.NUMBER },
                overallScore: { type: Type.NUMBER }
              }
            },
            feedbackSummary: { type: Type.STRING },
            hotSpots: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  measure: { type: Type.STRING },
                  notes: { type: Type.ARRAY, items: { type: Type.STRING } },
                  issue: { type: Type.STRING },
                  drillType: { type: Type.STRING, enum: ['SPEED_RAMP', 'RHYTHM_ISOLATION', 'INTERVAL_TRAINING'] },
                  drillSpeed: { type: Type.NUMBER }
                }
              }
            }
          }
        }
      }
    });
    return cleanAndParseJSON(response.text!, fallback);
  } catch (error) {
    return handleGenAIError(error, fallback);
  }
};

// --- LIVE LOOPING: Backing Track Generator ---
export const generateBackingTrack = async (style: AccompanimentStyle, key: string, bpm: number): Promise<BackingTrack> => {
  const prompt = `
    Create a musical backing track structure in the key of ${key} at ${bpm} BPM.
    Style: ${style}.
    Provide a 1-bar drum pattern (16 steps) and a bass line.
  `;
  
  const fallback: BackingTrack = {
      style, key, bpm,
      drumPattern: {
        kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
        snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
        hat: [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true]
      },
      bassLine: [{note: 'C2', step: 0, duration: 4}, {note: 'G2', step: 8, duration: 4}]
    };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            style: { type: Type.STRING },
            key: { type: Type.STRING },
            bpm: { type: Type.INTEGER },
            drumPattern: {
              type: Type.OBJECT,
              properties: {
                kick: { type: Type.ARRAY, items: { type: Type.BOOLEAN } },
                snare: { type: Type.ARRAY, items: { type: Type.BOOLEAN } },
                hat: { type: Type.ARRAY, items: { type: Type.BOOLEAN } },
              },
              required: ["kick", "snare", "hat"]
            },
            bassLine: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                   note: { type: Type.STRING }, // e.g. "C2"
                   step: { type: Type.INTEGER }, // 0-15
                   duration: { type: Type.NUMBER } // in steps
                }
              }
            }
          },
          required: ["style", "key", "bpm", "drumPattern", "bassLine"]
        }
      }
    });
    return cleanAndParseJSON(response.text!, fallback);
  } catch (error) {
    return handleGenAIError(error, fallback);
  }
};

// --- GOOGLE MAPS: Location Finder ---
export const findNearbyPlaces = async (query: string, location: { lat: number; lng: number }): Promise<{ text: string, chunks: any[] }> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find ${query} near the user's current location. List at least 3 distinct options if possible, including their names and addresses.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: { 
            retrievalConfig: { 
                latLng: { latitude: location.lat, longitude: location.lng } 
            } 
        }
      },
    });

    return {
      text: response.text || "No results found.",
      chunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (error) {
    console.error("Maps error", error);
    if (error.toString().includes('429')) throw new Error("API_QUOTA_EXCEEDED");
    return { text: "Could not access Maps service. Please ensure location permissions are granted.", chunks: [] };
  }
};

// --- SYSTEM AUDIT ---
export const checkSystemHealth = async () => {
    const start = Date.now();
    try {
        await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'ping',
            config: { maxOutputTokens: 1 }
        });
        const latency = Date.now() - start;
        return { status: 'ONLINE', latency };
    } catch (e) {
        return { status: 'OFFLINE', latency: 0 };
    }
}
