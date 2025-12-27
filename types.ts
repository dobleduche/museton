

export interface Note {
  name: string;
  octave?: number;
  midi?: number;
}

export interface TheoryData {
  type: 'scale' | 'chord' | 'interval' | 'note';
  root: string;
  name: string;
  notes: string[];
  intervals: string[];
  description: string;
  mood?: string;
}

export interface UserPersona {
  name: string;
  level: number;
  xp: number;
  nextLevelXp: number;
  style: string; // e.g., "Jazz", "Trap", "Classical"
  instrument: string;
  badges: string[];
}

export interface MusicalSettings {
  tuning: number; // e.g. 440, 432
  rootKey: string; // "Auto", "C", "F#"
  complexity: 'Simple' | 'Advanced';
}

export interface SynthConfig {
  waveform: 'sine' | 'square' | 'sawtooth' | 'triangle';
  attack: number;  // 0 to 2s
  decay: number;   // 0 to 2s
  sustain: number; // 0 to 1 (gain)
  release: number; // 0 to 5s
  filterCutoff: number; // 20 to 20000 Hz
  filterResonance: number; // 0 to 20
}

export interface UserPreferences {
  theme: 'neon' | 'cyber' | 'minimal';
  cookiesAccepted: boolean;
  lowPerformanceMode: boolean; // Disables heavy visuals
  autoSave: boolean;
  metronomeVolume: number;
  masterTuning: number;
}

export interface Tutor {
  id: string;
  name: string;
  specialty: string[];
  isVerified: boolean;
  rating: number;
  rate: string;
  location: string; // "Remote" or City
  avatar: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  xpReward: number;
  explanation: string;
}

export interface BeatProject {
  title: string;
  bpm: number;
  genre: string;
  structure: string[]; // e.g., ["Intro", "Verse", "Hook"]
  instruments: string[];
  notes: string; // "Optical" representation
  // AI Generated Patterns (16 steps)
  patterns?: {
    kick: boolean[];
    snare: boolean[];
    hat: boolean[];
    clap: boolean[];
  };
}

export interface AudioAnalysis {
  matchFound: boolean;
  identifiedSong?: {
    title: string;
    artist: string;
    album?: string;
    releaseYear?: string;
    coverColor?: string; // Hex code for UI theming
  };
  detectedGenre: string;
  likelyKey: string;
  bpm: number;
  similarArtists: string[];
  globalUsageMatches: { country: string; usageCount: number }[];
}

// --- MASTERY & PRACTICE TYPES ---

export interface MasteryMetrics {
  accuracy: number; // 0-100
  timing: number;   // 0-100 (latency consistency)
  dynamics: number; // 0-100 (velocity variance - simulated for keyboard)
  expression: number; // 0-100 (AI derived)
  overallScore: number; // Weighted Average
}

export interface HotSpot {
  id: string;
  measure: string; // e.g. "Measure 2"
  notes: string[];
  issue: string; // "Rushing", "Wrong Note", "Hesitation"
  drillType: 'SPEED_RAMP' | 'RHYTHM_ISOLATION' | 'INTERVAL_TRAINING';
  drillSpeed: number; // Percentage, e.g. 0.6 (60%)
}

export interface PracticeSession {
  id?: number;
  timestamp: Date;
  targetScaleOrSong: string;
  metrics: MasteryMetrics;
  feedbackSummary: string;
  hotSpots: HotSpot[];
}

// --- LIVE LOOPING & ACCOMPANIMENT ---

export type AccompanimentStyle = 'JAZZ_TRIO' | 'LOFI_HIPHOP' | 'CINEMATIC' | 'TRAP' | 'REGGAE_DUB';

export interface BackingTrack {
  style: AccompanimentStyle;
  key: string;
  bpm: number;
  drumPattern: {
    kick: boolean[];
    snare: boolean[];
    hat: boolean[];
  };
  bassLine: { note: string; step: number; duration: number }[]; // Step 0-15
}

export interface LoopSession {
  id?: string;
  backingTrack?: BackingTrack;
  userLoopBlob?: Blob;
  userLoopBuffer?: AudioBuffer;
}

// --- AUDIO ENGINE TYPES ---

export type AudioEnvironment = 
  | 'STUDIO' 
  | 'STADIUM' 
  | 'DUNGEON' 
  | 'HALLWAY' 
  | 'GARAGE' 
  | 'CLUB' 
  | 'CONCERT' 
  | 'ORCHESTRA';

export type EqPreset = 
  | 'FLAT' 
  | 'SUPER-BASS' 
  | 'MELLOW' 
  | 'POP' 
  | 'TREBLE' 
  | 'REGGAE';

export type SurroundMode = 'STEREO' | 'DOLBY_SIM' | 'WIDE_3D';

export type InstrumentType = 'PIANO' | 'GUITAR' | 'SYNTH' | 'STRINGS' | 'HORNS';

export interface SequencerTrack {
  id: string;
  name: string;
  type: 'KICK' | 'SNARE' | 'HAT' | 'CLAP';
  steps: boolean[]; // Array of 16 steps
  color: string;
}

export interface MixerState {
  environment: AudioEnvironment;
  eq: EqPreset;
  surround: SurroundMode;
  volume: number;
  isHolographicVisible: boolean;
}

// --- LESSONS & HOMEWORK ---

export interface LessonStep {
  instruction: string;
  targetNotes: string[]; // e.g. ["C4", "E4", "G4"]
  requiredDuration?: number;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  instrument: InstrumentType;
  steps: LessonStep[];
  xpReward: number;
}

export interface Assignment {
  id: string;
  title: string;
  provider: 'Internal' | 'Spotify' | 'SoundCloud' | 'Flat.io' | 'GoogleClassroom';
  link?: string; // For external
  dueDate: Date;
  status: 'Pending' | 'In Progress' | 'Completed';
  lessonId?: string; // If internal lesson
  thumbnail?: string;
}

// --- DB ENTITIES ---

export interface HistoryItem {
  id?: number;
  type: 'search' | 'id' | 'creation' | 'practice';
  content: string;
  timestamp: Date;
  metadata?: any;
}

export interface SavedProject {
  id?: number;
  name: string;
  data: BeatProject;
  timestamp: Date;
}

export interface SavedAnalysis {
  id?: number;
  result: AudioAnalysis;
  timestamp: Date;
}