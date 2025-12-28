

import React, { useState, useRef, useEffect } from 'react';
import { 
  Music, Search, Mic, Radio, BookOpen, Crown, User, ShieldCheck, MapPin, 
  Play, Pause, Settings as SettingsIcon, Save, Disc, Activity, Keyboard, Grid, Volume2, Cpu, Sliders, CheckCircle, Trash2, Download, Clock, Zap, FileAudio,
  Target, GraduationCap, History as HistoryIcon, Repeat, Lock, MessageSquare, TrendingDown, Guitar as GuitarIcon, ExternalLink, WifiOff, AlertTriangle, Menu, FileText
} from 'lucide-react';
import { 
  parseMusicQuery, 
  generateDailyQuiz, 
  analyzeAudioEnvironment,
  generateBeatStructure,
  generatePerformanceReview,
  findNearbyPlaces
} from './services/geminiService';
import { Piano } from './components/Piano';
import { Guitar } from './components/Guitar';
import { HolographicConsole } from './components/HolographicConsole';
import { MasteryDashboard } from './components/MasteryDashboard';
import { LiveLooper } from './components/LiveLooper';
import { Sequencer } from './components/Sequencer';
import { SystemAudit } from './components/SystemAudit';
import { OnboardingTour } from './components/OnboardingTour';
import { AudioIdentifier } from './components/AudioIdentifier';
import { TutorChat } from './components/TutorChat';
import { TutorDirectory } from './components/TutorDirectory';
import { HomeworkDashboard } from './components/HomeworkDashboard';
import { LessonOverlay } from './components/LessonOverlay';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { CookieBanner } from './components/CookieBanner';
import { InvestorHUD } from './components/InvestorHUD';
import { Footer } from './components/Footer';
import { CircleOfFifths } from './components/CircleOfFifths';
import { SynthPanel } from './components/SynthPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SettingsModal } from './components/SettingsModal';
import { TheoryData, UserPersona, BeatProject, AudioAnalysis, MixerState, SequencerTrack, InstrumentType, MusicalSettings, Tutor, HistoryItem, PracticeSession, HotSpot, SynthConfig, UserPreferences, Assignment, Lesson } from './types';
import { audio } from './services/audioEngine';
import { db } from './services/db';

// --- Components ---

const PersonaCard = ({ persona }: { persona: UserPersona }) => (
  <div className="glass-panel rounded-xl p-4 flex items-center gap-4 hover:bg-white/5 transition border-l-4 border-l-cyan-500">
    <div className="relative">
       <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-600 to-purple-700 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-2xl font-bold font-mono text-white">
         {persona.name.charAt(0)}
       </div>
       <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-black rounded-full flex items-center justify-center border border-slate-700">
          <Crown className="w-3 h-3 text-yellow-400" />
       </div>
    </div>
    <div className="flex-1">
      <div className="flex justify-between items-start">
         <h3 className="font-bold text-xl tracking-tight text-white neon-cyan">{persona.name}</h3>
         <span className="text-xs font-mono text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-500/30">LVL {persona.level}</span>
      </div>
      <p className="text-xs text-slate-400 mb-2 font-medium tracking-wide uppercase">{persona.style} • {persona.instrument}</p>
      
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 shadow-[0_0_10px_currentColor]" style={{ width: `${(persona.xp/persona.nextLevelXp)*100}%` }}></div>
      </div>
    </div>
  </div>
);

const InstrumentSelector = ({ current, onSelect }: { current: InstrumentType, onSelect: (t: InstrumentType) => void }) => {
  const instruments: { id: InstrumentType, icon: any, color: string }[] = [
    { id: 'PIANO', icon: Grid, color: 'text-cyan-400' },
    { id: 'GUITAR', icon: GuitarIcon, color: 'text-amber-400' },
    { id: 'SYNTH', icon: Cpu, color: 'text-purple-400' },
    { id: 'STRINGS', icon: Activity, color: 'text-emerald-400' },
    { id: 'HORNS', icon: Volume2, color: 'text-yellow-400' },
  ];
  return (
    <div className="glass-panel p-1 rounded-xl flex gap-1 inline-flex">
       {instruments.map(inst => (
         <button 
           key={inst.id}
           onClick={() => onSelect(inst.id)}
           className={`px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-all ${
             current === inst.id 
               ? 'bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)] border border-white/20' 
               : 'text-slate-500 hover:text-white hover:bg-white/5'
           }`}
         >
           <inst.icon className={`w-4 h-4 ${current === inst.id ? inst.color : ''}`} />
           <span>{inst.id}</span>
         </button>
       ))}
    </div>
  );
};

// --- Mock Data ---
const MOCK_TUTORS: Tutor[] = [
    { id: '1', name: "Maestro Vance", specialty: ["Jazz", "Theory"], isVerified: true, rating: 5.0, rate: "$$$", location: "New York", avatar: "V" },
    { id: '2', name: "Producer Lex", specialty: ["Trap", "Mixing"], isVerified: true, rating: 4.8, rate: "$$", location: "Atlanta", avatar: "L" },
    { id: '3', name: "Sarah Keys", specialty: ["Classical", "Piano"], isVerified: true, rating: 4.9, rate: "$$", location: "London", avatar: "S" },
    { id: '4', name: "Dr. Rhythm", specialty: ["Percussion", "Polyrhythms"], isVerified: false, rating: 4.5, rate: "$", location: "Remote", avatar: "R" },
];

const MOCK_ASSIGNMENTS: Assignment[] = [
  { id: '1', title: 'C Major Scale Mastery', provider: 'Internal', dueDate: new Date(Date.now() + 86400000), status: 'Pending', lessonId: 'lesson-c-maj' },
  { id: '2', title: 'Listen: Kind of Blue', provider: 'Spotify', link: 'https://spotify.com', dueDate: new Date(Date.now() + 172800000), status: 'Pending', thumbnail: 'https://upload.wikimedia.org/wikipedia/en/9/9c/MilesDavisKindofBlue.jpg' },
  { id: '3', title: 'Trap Beat Basics', provider: 'SoundCloud', link: 'https://soundcloud.com', dueDate: new Date(Date.now() + 259200000), status: 'Completed', thumbnail: 'https://i1.sndcdn.com/artworks-000242801280-hp1541-t500x500.jpg' },
  { id: '4', title: 'Sight Reading 101', provider: 'Flat.io', link: 'https://flat.io', dueDate: new Date(Date.now() + 604800000), status: 'Pending' },
];

const MOCK_LESSONS: Record<string, Lesson> = {
  'lesson-c-maj': {
    id: 'lesson-c-maj',
    title: 'C Major Scale',
    description: 'Learn the foundational scale of Western music.',
    difficulty: 'Beginner',
    instrument: 'PIANO',
    xpReward: 150,
    steps: [
      { instruction: "Play Middle C (C4)", targetNotes: ["C4"] },
      { instruction: "Play D4", targetNotes: ["D4"] },
      { instruction: "Play E4", targetNotes: ["E4"] },
      { instruction: "Play F4", targetNotes: ["F4"] },
      { instruction: "Play G4", targetNotes: ["G4"] },
      { instruction: "Play A4", targetNotes: ["A4"] },
      { instruction: "Play B4", targetNotes: ["B4"] },
      { instruction: "Finish with High C (C5)", targetNotes: ["C5"] },
    ]
  }
};

const DEFAULT_PREFS: UserPreferences = {
    theme: 'neon',
    cookiesAccepted: false, // Defaulting to false for rigorous consent
    lowPerformanceMode: false,
    autoSave: true,
    metronomeVolume: 0.5,
    masterTuning: 440
};

// --- Main App ---

export const App = () => {
  // State
  const [activeTab, setActiveTab] = useState<'learn' | 'studio' | 'identify' | 'tutors' | 'history' | 'loop' | 'homework'>('learn');
  const [prompt, setPrompt] = useState('');
  const [theoryData, setTheoryData] = useState<TheoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHolographic, setShowHolographic] = useState(false);
  
  // New State for Features
  const [showAudit, setShowAudit] = useState(false);
  const [showInvestorHUD, setShowInvestorHUD] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [activeTutor, setActiveTutor] = useState<Tutor | null>(null);
  const [synthConfig, setSynthConfig] = useState<SynthConfig>(audio.synthConfig);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Persistence & Prefs
  const [showSettings, setShowSettings] = useState(false);
  const [userPrefs, setUserPrefs] = useState<UserPreferences>(DEFAULT_PREFS);
  const [showCookieBanner, setShowCookieBanner] = useState(false);

  // Maps State
  const [mapSearchTerm, setMapSearchTerm] = useState("");
  const [mapResults, setMapResults] = useState<{ text: string, chunks: any[] } | null>(null);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationError, setLocationError] = useState(false);

  // Audio & Mixer
  const [mixerState, setMixerState] = useState<MixerState>({
    environment: 'STUDIO',
    eq: 'FLAT',
    surround: 'STEREO',
    volume: 0.8,
    isHolographicVisible: false
  });

  // Persona
  const [persona, setPersona] = useState<UserPersona>({
    name: "Guest Artist",
    level: 1,
    xp: 0,
    nextLevelXp: 100,
    style: "Classical",
    instrument: "Piano",
    badges: []
  });

  // Settings
  const [musicalSettings, setMusicalSettings] = useState<MusicalSettings>({
    tuning: 440,
    rootKey: 'Auto',
    complexity: 'Simple'
  });

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // History & DB
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [recordings, setRecordings] = useState<any[]>([]);
  
  // Practice Mode & Real Scoring
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [targetNotes, setTargetNotes] = useState<string[]>([]);
  const [playedNotes, setPlayedNotes] = useState<{note: string, time: number}[]>([]);
  const [practiceSession, setPracticeSession] = useState<PracticeSession | null>(null);

  // Studio State
  const [beatProject, setBeatProject] = useState<BeatProject>({
    title: "New Project",
    bpm: 120,
    genre: "Electronic",
    structure: [],
    instruments: [],
    notes: "",
    patterns: {
      kick: new Array(16).fill(false),
      snare: new Array(16).fill(false),
      hat: new Array(16).fill(false),
      clap: new Array(16).fill(false),
    }
  });

  // Guided Lesson State
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>(MOCK_ASSIGNMENTS);
  const [lastInputEvent, setLastInputEvent] = useState<{note: string, timestamp: number} | null>(null);

  // Init & Persistence Check
  useEffect(() => {
    const init = async () => {
      // 1. Check LocalStorage for Persistence Flag
      const storedPrefs = localStorage.getItem('museton-prefs');
      if (storedPrefs) {
          const parsed = JSON.parse(storedPrefs);
          setUserPrefs(parsed);
      } else {
          // If no prefs, show the banner
          setShowCookieBanner(true);
      }

      // Load Pro Status
      const savedPro = localStorage.getItem('museton-pro');
      if (savedPro === 'true') setIsPro(true);

      // Load Synth Params
      const savedSynth = localStorage.getItem('museton-synth');
      if (savedSynth) {
          const cfg = JSON.parse(savedSynth);
          setSynthConfig(cfg);
          audio.updateSynthParams(cfg);
      }

      // Load user
      const savedUser = await db.getPersona("Guest Artist");
      if (savedUser) setPersona(savedUser);
      else setShowOnboarding(true); // First time visit
      
      // Load history
      const hist = await db.getHistory();
      setHistory(hist.sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime()));
      
      // Auto-load a scale if history is empty to show off functionality
      if (hist.length === 0) {
         setPrompt("C Major Scale");
         // Silent load
         parseMusicQuery("C Major Scale", musicalSettings).then(data => setTheoryData(data)).catch(() => {});
      }

      // Load recordings
      const recs = await db.getRecordings();
      setRecordings(recs);

      // Load mixer settings
      const savedMixer = localStorage.getItem('museton-mixer');
      if (savedMixer) setMixerState(JSON.parse(savedMixer));
    
      // Get Location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => {
                console.warn("Location denied:", err);
                setLocationError(true);
            }
        );
      } else {
          setLocationError(true);
      }

      // Network Listeners
      window.addEventListener('online', () => setIsOnline(true));
      window.addEventListener('offline', () => setIsOnline(false));
    };
    init();
  }, []);

  // Update Prefs Handler
  const updatePrefs = (updates: Partial<UserPreferences>) => {
      const newUserPrefs = { ...userPrefs, ...updates };
      setUserPrefs(newUserPrefs);
      // Always save for now since banner is removed
      localStorage.setItem('museton-prefs', JSON.stringify(newUserPrefs));
      
      // Apply immediate effects
      if (updates.masterTuning) setMusicalSettings(s => ({...s, tuning: updates.masterTuning!}));
  };
  
  const handleConsent = (accepted: boolean) => {
      updatePrefs({ cookiesAccepted: accepted });
      setShowCookieBanner(false);
  };

  // Audio Engine Sync
  useEffect(() => {
    audio.setEnvironment(mixerState.environment);
    audio.setEQ(mixerState.eq);
    audio.setMasterVolume(mixerState.volume);
  }, []);

  // Global Interaction Listener to Resume Audio Context
  useEffect(() => {
      const resumeAudio = () => {
          audio.resume();
      };
      window.addEventListener('click', resumeAudio);
      window.addEventListener('keydown', resumeAudio);
      return () => {
          window.removeEventListener('click', resumeAudio);
          window.removeEventListener('keydown', resumeAudio);
      };
  }, []);

  const handleQuery = async (overridePrompt?: string) => {
    const p = overridePrompt || prompt;
    if (!p) return;
    if (!isOnline) {
        alert("You are offline. Please reconnect to use AI features.");
        return;
    }
    setLoading(true);
    setPrompt(p); // Update UI input if override used
    try {
      const data = await parseMusicQuery(p, musicalSettings);
      setTheoryData(data);
      
      // Add XP
      const newXp = persona.xp + 10;
      updatePersona(newXp);

      // Save History if persistence enabled
      if (userPrefs.cookiesAccepted) {
        await db.addToHistory({
            type: 'search',
            content: `Analyzed: ${p}`,
            metadata: data
        });
        refreshHistory();
      }

    } catch (e: any) {
      if (e.message === 'API_QUOTA_EXCEEDED') {
          setShowProModal(true);
          alert("Free Tier API Usage Exceeded. Please Upgrade to Pro.");
      } else {
          console.error(e);
      }
    }
    setLoading(false);
  };

  const updatePersona = async (newXp: number) => {
    let newLevel = persona.level;
    let nextXp = persona.nextLevelXp;
    
    if (newXp >= nextXp) {
      newLevel++;
      newXp = newXp - nextXp;
      nextXp = Math.floor(nextXp * 1.5);
      audio.playTone(880, 'sine', 0.1);
      setTimeout(() => audio.playTone(1760, 'sine', 0.2), 100);
    }

    const updated = { ...persona, xp: newXp, level: newLevel, nextLevelXp: nextXp };
    setPersona(updated);
    if (userPrefs.cookiesAccepted) await db.savePersona(updated);
  };

  const refreshHistory = async () => {
    const h = await db.getHistory();
    setHistory(h.sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime()));
  };

  const refreshRecordings = async () => {
    const recs = await db.getRecordings();
    setRecordings(recs);
  };

  const handleRecordingToggle = () => {
    if (isRecording) {
      audio.stopRecording().then(async (blob) => {
        const name = `Jam ${new Date().toLocaleTimeString()}`;
        if (userPrefs.cookiesAccepted) await db.saveRecording(blob, name, recordingTime);
        refreshRecordings();
      });
      setIsRecording(false);
      setRecordingTime(0);
    } else {
      audio.startRecording();
      setIsRecording(true);
      const interval = setInterval(() => {
        setRecordingTime(t => {
           if (!audio.getContext()) { clearInterval(interval); return 0; }
           return t + 1;
        });
      }, 1000);
    }
  };

  const handleDeleteRecording = async (id: number) => {
    await db.deleteRecording(id);
    refreshRecordings();
  };

  const handlePlayRecording = async (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = new Audio(url);
    a.play();
  };

  const handleDownloadRecording = (blob: Blob, name: string) => {
    if (!isPro) {
      setShowProModal(true);
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.webm`;
    a.click();
  };

  const startPracticeChallenge = () => {
    setIsPracticeMode(true);
    const scale = ['C4','D4','E4','F4','G4','A4','B4','C5'];
    setTargetNotes(scale);
    setPlayedNotes([]); 
    setPracticeSession(null);
  };

  const handleNoteInput = (note: string) => {
    // For Lessons: Timestamp the input to allow repeats
    if (activeLesson) {
        setLastInputEvent({ note, timestamp: Date.now() });
    }

    // For Practice Challenge
    if (isPracticeMode) {
      setPlayedNotes(prev => [...prev, { note, time: Date.now() }]);
    }
  };

  const endPracticeChallenge = async () => {
    setIsPracticeMode(false);
    let hits = 0;
    targetNotes.forEach(target => {
       if (playedNotes.some(p => p.note === target)) hits++;
    });
    const accuracy = targetNotes.length > 0 ? Math.round((hits / targetNotes.length) * 100) : 0;
    const timing = Math.max(0, 100 - (Math.abs(playedNotes.length - targetNotes.length) * 10));

    const realMetrics = { accuracy: Math.min(100, accuracy), timing: timing };
    
    setLoading(true);
    const feedback = await generatePerformanceReview(targetNotes, playedNotes, realMetrics);
    setLoading(false);

    if (feedback.metrics) {
      const fullSession: PracticeSession = {
        timestamp: new Date(),
        targetScaleOrSong: "C Major Scale Challenge",
        metrics: feedback.metrics as any,
        feedbackSummary: feedback.feedbackSummary || "",
        hotSpots: feedback.hotSpots || []
      };
      setPracticeSession(fullSession);
      if(userPrefs.cookiesAccepted) await db.savePracticeSession(fullSession);
      updatePersona(persona.xp + (accuracy > 80 ? 100 : 50));
    }
    setTargetNotes([]);
  };

  const handleAIGenerateBeat = async (prompt: string) => {
    if (!isPro) {
        setShowProModal(true);
        return;
    }
    if (!isOnline) return;
    setLoading(true);
    try {
       const project = await generateBeatStructure(prompt);
       setBeatProject(project);
    } catch(e: any) {
       if (e.message === 'API_QUOTA_EXCEEDED') setShowProModal(true);
       else console.error(e);
    }
    setLoading(false);
  };

  const updateSynth = (updates: Partial<SynthConfig>) => {
      const newConfig = { ...synthConfig, ...updates };
      audio.updateSynthParams(updates);
      setSynthConfig(newConfig);
      if(userPrefs.cookiesAccepted) localStorage.setItem('museton-synth', JSON.stringify(newConfig));
  };

  const handleInstrumentSelect = (t: InstrumentType) => {
      audio.setInstrument(t);
      setMixerState({...mixerState});
      setSynthConfig(audio.synthConfig); // Load preset params
  };
  
  const handleMapSearch = async () => {
      if (!isOnline) return;
      if (locationError || !location) {
          alert("Location access is required to find nearby places. Please enable it in your browser settings.");
          return;
      }
      setLoading(true);
      try {
        const results = await findNearbyPlaces(mapSearchTerm || "Music School", location);
        setMapResults(results);
      } catch (e: any) {
        if (e.message === 'API_QUOTA_EXCEEDED') setShowProModal(true);
      }
      setLoading(false);
  };

  // Lesson Logic
  const startLesson = (lessonId: string) => {
    const lesson = MOCK_LESSONS[lessonId];
    if (lesson) {
        setActiveLesson(lesson);
        setActiveTab('learn'); // Switch to instrument view
        handleInstrumentSelect(lesson.instrument);
    }
  };

  const handleLessonComplete = (xp: number) => {
      alert(`Lesson Completed! +${xp} XP`);
      updatePersona(persona.xp + xp);
      setActiveLesson(null);
      // Mark assignment complete if applicable
      const assign = assignments.find(a => a.lessonId === activeLesson?.id);
      if (assign) {
          handleUpdateAssignment(assign.id, 'Completed');
      }
  };
  
  const handleUpdateAssignment = (id: string, status: Assignment['status']) => {
      setAssignments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  return (
    <ErrorBoundary>
    <div className="min-h-screen text-slate-200 pb-24 selection:bg-cyan-500/30">
      
      {/* Background Ambience */}
      {!userPrefs.lowPerformanceMode && (
        <div className="fixed inset-0 pointer-events-none z-[-1]">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-900/10 rounded-full blur-[100px] animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>
      )}

      {/* Offline Banner */}
      {!isOnline && (
          <div className="fixed top-0 inset-x-0 z-50 bg-red-900/90 text-white text-xs font-bold py-1 text-center flex items-center justify-center gap-2">
              <WifiOff className="w-3 h-3" /> OFFLINE MODE - AI FEATURES DISABLED
          </div>
      )}

      {/* Overlays */}
      {showCookieBanner && <CookieBanner onAccept={() => handleConsent(true)} onReject={() => handleConsent(false)} />}
      {showSettings && <SettingsModal prefs={userPrefs} onUpdate={updatePrefs} onClose={() => setShowSettings(false)} />}
      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}

      {showHolographic && (
        <HolographicConsole 
          state={mixerState} 
          onUpdate={(updates) => {
              setMixerState(prev => {
                  const next = { ...prev, ...updates };
                  if(userPrefs.cookiesAccepted) localStorage.setItem('museton-mixer', JSON.stringify(next));
                  return next;
              });
          }}
          onClose={() => setShowHolographic(false)} 
        />
      )}
      
      {showAudit && (
        <SystemAudit 
          onClose={() => setShowAudit(false)} 
          toggleHUD={() => setShowInvestorHUD(!showInvestorHUD)} 
        />
      )}
      
      {showInvestorHUD && <InvestorHUD />}
      
      {showOnboarding && <OnboardingTour onComplete={() => setShowOnboarding(false)} />}

      {activeTutor && (
          <TutorChat 
            tutor={activeTutor} 
            onClose={() => setActiveTutor(null)} 
            isPro={isPro} // Pass isPro prop here
          />
      )}
      
      {/* Lesson Overlay */}
      {activeLesson && (
          <LessonOverlay 
            lesson={activeLesson}
            onClose={() => setActiveLesson(null)}
            onComplete={handleLessonComplete}
            lastInputEvent={lastInputEvent}
          />
      )}

      {showProModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
             <div className="glass-panel p-8 rounded-2xl max-w-md w-full text-center border-t-4 border-t-yellow-400 animate-in fade-in slide-in-from-bottom-4">
                  <div className="w-16 h-16 bg-yellow-400/20 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                      <Crown className="w-8 h-8 text-yellow-400" />
                      <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">-50%</div>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Unlock Pro Studio</h2>
                  <p className="text-slate-400 mb-6">Advanced AI generation and Export features are available on the Pro Plan.</p>
                  
                  <div className="bg-slate-900/50 rounded-lg p-4 mb-6 border border-white/5">
                      <div className="flex justify-between items-center mb-2 pb-2 border-b border-white/5">
                          <span className="text-slate-500 text-xs">COMPETITORS</span>
                          <span className="text-slate-400 line-through decoration-red-500">$29.99/mo</span>
                      </div>
                      <div className="flex justify-between items-center">
                          <span className="text-yellow-400 font-bold flex items-center gap-2"><Crown className="w-3 h-3"/> MUSETON PRO</span>
                          <span className="text-white font-bold text-xl">$14.99<span className="text-xs text-slate-500 font-normal">/mo</span></span>
                      </div>
                  </div>

                  <div className="space-y-3 mb-8 text-left">
                      <div className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle className="w-4 h-4 text-emerald-400" /> Unlimited AI Beat Generation</div>
                      <div className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle className="w-4 h-4 text-emerald-400" /> Export WAV/MIDI</div>
                      <div className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle className="w-4 h-4 text-emerald-400" /> Unlimited Tutor Chat</div>
                      <div className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle className="w-4 h-4 text-emerald-400" /> Advanced Audio Analysis</div>
                  </div>

                  <div className="flex gap-4">
                      <button onClick={() => setShowProModal(false)} className="flex-1 py-3 text-slate-400 font-bold hover:text-white">Cancel</button>
                      <button onClick={() => { setIsPro(true); setShowProModal(false); if(userPrefs.cookiesAccepted) localStorage.setItem('museton-pro', 'true'); }} className="flex-1 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-lg shadow-lg shadow-yellow-500/20 hover:scale-105 transition-transform flex items-center justify-center gap-2">
                          Upgrade Now <TrendingDown className="w-4 h-4" />
                      </button>
                  </div>
             </div>
        </div>
      )}

      {/* Header / Navbar */}
      <header className="sticky top-0 z-30 bg-black/50 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="relative">
                <Music className="w-8 h-8 text-cyan-400" />
                <div className="absolute inset-0 bg-cyan-400 blur-lg opacity-40 animate-pulse"></div>
             </div>
             <h1 className="text-2xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
               MusetoN
             </h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-slate-900/50 rounded-full p-1 border border-white/10">
               <button 
                 onClick={handleRecordingToggle}
                 className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 shadow-[0_0_15px_red] animate-pulse' : 'bg-slate-800 hover:bg-red-900/50'}`}
               >
                 <div className={`w-3 h-3 rounded-sm ${isRecording ? 'bg-white' : 'bg-red-500 rounded-full'}`}></div>
               </button>
               {isRecording && <span className="text-xs font-mono text-red-400 px-2">{new Date(recordingTime * 1000).toISOString().substr(14, 5)}</span>}
            </div>
            
            <button 
                onClick={() => isPro ? setIsPro(false) : setShowProModal(true)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${
                    isPro 
                    ? 'bg-yellow-500/10 border-yellow-500 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]' 
                    : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-white'
                }`}
            >
                <Crown className="w-3 h-3" />
                {isPro ? 'PRO ACTIVE' : 'GO PRO'}
            </button>
            
            <div className="flex gap-1">
                <button 
                    onClick={() => audio.panic()}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-900/20 transition-all"
                    title="PANIC: STOP ALL AUDIO"
                >
                    <AlertTriangle className="w-5 h-5" />
                </button>

                <button 
                    onClick={() => setShowAudit(true)}
                    className={`p-2 rounded-lg transition-colors ${showInvestorHUD ? 'text-emerald-400 bg-emerald-900/20' : 'text-slate-400 hover:text-emerald-400'}`}
                    title="System Diagnostics"
                >
                    <Activity className="w-5 h-5" />
                </button>

                <button 
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg text-slate-400 hover:text-white transition-all hover:bg-white/5"
                title="Preferences & Basic Tools"
                >
                <Menu className="w-5 h-5" />
                </button>

                <button 
                onClick={() => setShowHolographic(!showHolographic)}
                className={`p-2 rounded-lg transition-all ${showHolographic ? 'text-cyan-400 bg-cyan-900/20' : 'text-slate-400 hover:text-white'}`}
                title="Advanced Holographic Mixer"
                >
                <SettingsIcon className="w-5 h-5" />
                </button>
            </div>

            <div className="h-8 w-[1px] bg-white/10"></div>
            <div className="flex items-center gap-3">
               <span className="hidden md:inline text-xs font-bold text-slate-400 uppercase tracking-widest">{persona.name}</span>
               <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-600 to-purple-700 flex items-center justify-center text-xs font-bold ring-2 ring-black/50">
                 {persona.name.charAt(0)}
               </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-4 space-y-6">
             <PersonaCard persona={persona} />
             
             {/* Swapped: Nav first */}
             <nav className="glass-panel p-2 rounded-xl flex flex-col gap-1">
                {[
                  { id: 'learn', icon: BookOpen, label: 'Learn & Play' },
                  { id: 'loop', icon: Repeat, label: 'Live Loop' },
                  { id: 'studio', icon: Disc, label: 'Studio' },
                  { id: 'identify', icon: Search, label: 'Identifier' },
                  { id: 'homework', icon: GraduationCap, label: 'Assignments' },
                  { id: 'tutors', icon: User, label: 'Global Connect' },
                  { id: 'history', icon: HistoryIcon, label: 'History & Library' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                      activeTab === item.id 
                        ? 'bg-gradient-to-r from-cyan-500/20 to-transparent text-cyan-400 border-l-2 border-cyan-500' 
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                ))}
             </nav>

             {/* Swapped: Circle second */}
             {activeTab === 'learn' && (
                <div className="animate-in fade-in slide-in-from-left-4">
                  <CircleOfFifths 
                    currentRoot={theoryData?.root || 'C'}
                    data={theoryData}
                    onSelectKey={(k) => handleQuery(`${k} Major Scale`)}
                  />
                </div>
             )}
             
             {/* Privacy Policy Link */}
             <button 
                onClick={() => setShowPrivacy(true)}
                className="w-full text-center text-xs text-slate-500 hover:text-cyan-400 transition-colors flex items-center justify-center gap-2"
             >
                 <ShieldCheck className="w-3 h-3" /> Privacy Policy & Compliance
             </button>

             <div className="glass-panel p-4 rounded-xl">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                   <Mic className="w-3 h-3" /> Recent Jams
                </h3>
                <div className="space-y-2">
                   {recordings.slice(0, 3).map((rec: any, i) => (
                     <div key={i} onClick={() => handlePlayRecording(rec.blob)} className="flex items-center justify-between p-2 rounded bg-white/5 hover:bg-white/10 group cursor-pointer">
                        <div className="flex items-center gap-2 overflow-hidden">
                           <FileAudio className="w-3 h-3 text-cyan-500" />
                           <span className="text-xs text-slate-300 truncate">{rec.name}</span>
                        </div>
                        <Play className="w-3 h-3 text-cyan-400 opacity-0 group-hover:opacity-100" />
                     </div>
                   ))}
                   {recordings.length === 0 && <div className="text-xs text-slate-600 italic">No recordings yet.</div>}
                </div>
             </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            
            {activeTab === 'learn' && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                <div className="glass-panel p-1 rounded-xl flex items-center gap-2 border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
                   <div className="pl-4 text-cyan-500"><Search className="w-5 h-5" /></div>
                   <input 
                     type="text"
                     value={prompt}
                     onChange={(e) => setPrompt(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
                     placeholder="Ask anything... 'F Minor Scale', 'Jazz Chord Progression', 'What is a Tritone?'"
                     className="flex-1 bg-transparent border-none text-white placeholder-slate-500 focus:ring-0 text-lg h-12"
                   />
                   <button 
                     onClick={() => handleQuery()}
                     disabled={loading || !isOnline}
                     className="px-6 h-10 m-1 bg-cyan-600 hover:bg-cyan-500 text-black font-bold rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
                   >
                     {loading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div> : <span>Analyze</span>}
                   </button>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-4 items-center justify-between">
                        <InstrumentSelector 
                            current={audio.activeInstrument} 
                            onSelect={handleInstrumentSelect}
                        />
                        
                        <div className="flex items-center gap-2 bg-black/30 rounded-lg p-1 border border-white/5">
                            <span className="text-[10px] text-slate-500 px-2 font-bold">TUNING</span>
                            <button 
                                onClick={() => setMusicalSettings(s => ({...s, tuning: 432}))}
                                className={`text-xs px-2 py-1 rounded ${musicalSettings.tuning === 432 ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400'}`}
                            >432Hz</button>
                            <button 
                                onClick={() => setMusicalSettings(s => ({...s, tuning: 440}))}
                                className={`text-xs px-2 py-1 rounded ${musicalSettings.tuning === 440 ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400'}`}
                            >440Hz</button>
                        </div>
                        
                        <button 
                            onClick={isPracticeMode ? endPracticeChallenge : startPracticeChallenge}
                            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all ${isPracticeMode ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse' : 'bg-slate-800 border-slate-700 hover:border-cyan-500'}`}
                        >
                            <Target className="w-4 h-4" />
                            {isPracticeMode ? 'STOP CHALLENGE' : 'PRACTICE MODE'}
                        </button>
                    </div>

                    {/* NEW: SYNTH RACK */}
                    <SynthPanel config={synthConfig} onChange={updateSynth} />
                </div>

                {audio.activeInstrument === 'GUITAR' ? (
                    <Guitar 
                      data={theoryData} 
                      tuning={musicalSettings.tuning}
                      targetNotes={activeLesson ? activeLesson.steps.flatMap(s => s.targetNotes) : targetNotes}
                      onPlayNote={handleNoteInput}
                    />
                ) : (
                    <Piano 
                      data={theoryData} 
                      tuning={musicalSettings.tuning} 
                      targetNotes={activeLesson ? activeLesson.steps.flatMap(s => s.targetNotes) : targetNotes}
                      onPlayNote={handleNoteInput}
                    />
                )}
                
                {theoryData && !isPracticeMode && (
                   <div className="glass-panel p-6 rounded-2xl border-t-4 border-t-cyan-500">
                      <div className="flex justify-between items-start mb-4">
                         <div>
                            <h2 className="text-3xl font-bold text-white mb-1">{theoryData.name}</h2>
                            <p className="text-cyan-400 font-mono text-sm">{theoryData.root} {theoryData.type.toUpperCase()}</p>
                         </div>
                         <div className="bg-slate-900/50 px-3 py-1 rounded border border-white/10 text-xs text-slate-400">
                            Mood: <span className="text-white">{theoryData.mood}</span>
                         </div>
                      </div>
                      <p className="text-slate-300 leading-relaxed text-lg mb-6">{theoryData.description}</p>
                      <div className="flex flex-wrap gap-2">
                         {theoryData.notes.map((n, i) => (
                           <div key={i} className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-bold text-sm hover:bg-cyan-500/20 hover:border-cyan-500 transition-colors cursor-default">
                             {n}
                           </div>
                         ))}
                      </div>
                   </div>
                )}

                {practiceSession && (
                  <MasteryDashboard 
                    session={practiceSession} 
                    onStartDrill={(spot) => console.log("Drill started:", spot)} 
                  />
                )}
              </div>
            )}

            {activeTab === 'loop' && (
              <div className="animate-in fade-in">
                 <LiveLooper onRecordingComplete={(blob) => {
                    db.saveRecording(blob, `Loop Session ${new Date().toLocaleTimeString()}`, 10);
                    refreshRecordings();
                 }} />
              </div>
            )}

            {activeTab === 'studio' && (
              <div className="space-y-6 animate-in fade-in">
                 <Sequencer 
                   project={beatProject} 
                   onUpdate={setBeatProject} 
                   onGenerateAI={handleAIGenerateBeat}
                 />
              </div>
            )}
            
            {/* New Identifier Tab */}
            {activeTab === 'identify' && (
                <AudioIdentifier />
            )}
            
            {/* New Homework Tab */}
            {activeTab === 'homework' && (
                <HomeworkDashboard 
                    assignments={assignments}
                    onStartLesson={startLesson}
                    onUpdateStatus={handleUpdateAssignment}
                />
            )}
            
            {activeTab === 'tutors' && (
                <TutorDirectory 
                    tutors={MOCK_TUTORS}
                    onChat={setActiveTutor}
                />
            )}

            {activeTab === 'history' && (
               <div className="space-y-8 animate-in fade-in">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                       <FileAudio className="w-6 h-6 text-cyan-500" /> Recording Library
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {recordings.length === 0 && <div className="p-8 text-center text-slate-500 border border-dashed border-white/10 rounded-xl">No recordings yet. Head to the Studio or Live Loop to make some noise!</div>}
                       {recordings.map((rec) => (
                         <div key={rec.id} className="glass-panel p-4 rounded-xl group relative overflow-hidden">
                            <div className="flex justify-between items-start">
                               <div>
                                  <h3 className="font-bold text-white">{rec.name}</h3>
                                  <p className="text-xs text-slate-400">{new Date(rec.timestamp).toLocaleDateString()} • {Math.round(rec.duration)}s</p>
                               </div>
                               <div className="flex gap-2">
                                  <button onClick={() => handlePlayRecording(rec.blob)} className="p-2 bg-cyan-600/20 text-cyan-400 rounded hover:bg-cyan-600 hover:text-black transition-all">
                                     <Play className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleDownloadRecording(rec.blob, rec.name)} className="p-2 bg-slate-800 text-slate-400 rounded hover:text-white transition-all relative">
                                     {isPro ? <Download className="w-4 h-4" /> : <Lock className="w-4 h-4 text-yellow-500" />}
                                  </button>
                                  <button onClick={() => handleDeleteRecording(rec.id)} className="p-2 bg-red-900/20 text-red-400 rounded hover:bg-red-600 hover:text-white transition-all">
                                     <Trash2 className="w-4 h-4" />
                                  </button>
                               </div>
                            </div>
                         </div>
                       ))}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                       <HistoryIcon className="w-6 h-6 text-purple-500" /> Activity Log
                    </h2>
                    <div className="space-y-2">
                      {history.map((item, i) => (
                        <div key={i} className="glass-panel p-4 rounded-xl flex items-center gap-4">
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.type === 'search' ? 'bg-cyan-900/30 text-cyan-400' : 'bg-purple-900/30 text-purple-400'}`}>
                              {item.type === 'search' ? <Search className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                           </div>
                           <div>
                              <p className="text-white font-medium">{item.content}</p>
                              <p className="text-xs text-slate-500">{new Date(item.timestamp).toLocaleString()}</p>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
               </div>
            )}
            
          </div>
        </div>
      </main>
      <Footer />
    </div>
    </ErrorBoundary>
  );
};