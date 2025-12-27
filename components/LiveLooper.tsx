
import React, { useState, useEffect, useRef } from 'react';
import { Mic, Play, Square, Repeat, Radio, Music2, Loader2 } from 'lucide-react';
import { AccompanimentStyle, BackingTrack } from '../types';
import { generateBackingTrack } from '../services/geminiService';
import { audio } from '../services/audioEngine';

interface Props {
  onRecordingComplete: (blob: Blob) => void;
}

const STYLES: { id: AccompanimentStyle; label: string; color: string }[] = [
  { id: 'JAZZ_TRIO', label: 'Jazz Trio', color: 'bg-yellow-600' },
  { id: 'LOFI_HIPHOP', label: 'Lofi Beats', color: 'bg-purple-600' },
  { id: 'CINEMATIC', label: 'Cinematic', color: 'bg-blue-600' },
  { id: 'TRAP', label: 'Trap', color: 'bg-red-600' },
  { id: 'REGGAE_DUB', label: 'Reggae Dub', color: 'bg-green-600' }
];

export const LiveLooper: React.FC<Props> = ({ onRecordingComplete }) => {
  const [isListening, setIsListening] = useState(false);
  const [detectedContext, setDetectedContext] = useState<{ key: string, bpm: number } | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<AccompanimentStyle>('LOFI_HIPHOP');
  const [backingTrack, setBackingTrack] = useState<BackingTrack | null>(null);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  const [isLoopRecording, setIsLoopRecording] = useState(false);
  const [hasRecordedLoop, setHasRecordedLoop] = useState(false);

  // Sequencer Timer
  useEffect(() => {
    let interval: any;
    if (isPlaying && backingTrack) {
      const stepTime = (60000 / backingTrack.bpm) / 4; // 16th notes
      interval = setInterval(() => {
        setCurrentStep(s => (s + 1) % 16);
      }, stepTime);
    }
    return () => clearInterval(interval);
  }, [isPlaying, backingTrack]);

  // Audio Playback Logic
  useEffect(() => {
    if (!isPlaying || !backingTrack) return;
    
    // Play Drums
    const drums = backingTrack.drumPattern;
    if (drums.kick[currentStep]) audio.playDrum('KICK');
    if (drums.snare[currentStep]) audio.playDrum('SNARE');
    if (drums.hat[currentStep]) audio.playDrum('HAT');

    // Play Bass
    const bassNote = backingTrack.bassLine.find(b => b.step === currentStep);
    if (bassNote) {
       // Convert note name to freq (simplified map)
       const noteMap: any = { 'C': 65.41, 'D': 73.42, 'E': 82.41, 'F': 87.31, 'G': 98.00, 'A': 110.00, 'B': 123.47 };
       const base = noteMap[bassNote.note.charAt(0)] || 65.41;
       audio.playBass(base, bassNote.duration * 0.2); // Scale duration
    }
  }, [currentStep, isPlaying, backingTrack]);

  const handleListen = () => {
    setIsListening(true);
    // Simulate listening
    setTimeout(() => {
      setDetectedContext({ key: 'Cm', bpm: 85 });
      setIsListening(false);
    }, 2500);
  };

  const handleGenerate = async () => {
    if (!detectedContext) return;
    setIsLoadingTrack(true);
    const track = await generateBackingTrack(selectedStyle, detectedContext.key, detectedContext.bpm);
    setBackingTrack(track);
    setIsLoadingTrack(false);
  };

  const toggleLoopRecording = async () => {
    if (isLoopRecording) {
      const blob = await audio.stopRecording();
      setIsLoopRecording(false);
      
      // Convert Blob to Buffer and Loop it
      const buffer = await audio.decodeAudioData(blob);
      audio.playLoop(buffer);
      setHasRecordedLoop(true);
      onRecordingComplete(blob);
    } else {
      audio.startRecording();
      setIsLoopRecording(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Context Detection */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center text-center">
        {!detectedContext ? (
          <>
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 relative">
               <Mic className={`w-8 h-8 ${isListening ? 'text-red-400 animate-pulse' : 'text-slate-400'}`} />
               {isListening && <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping"></div>}
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Contextual Awareness</h3>
            <p className="text-slate-400 text-sm mb-6">Play a few notes. I'll detect Key & Tempo.</p>
            <button 
              onClick={handleListen}
              disabled={isListening}
              className="bg-cyan-600 hover:bg-cyan-500 px-6 py-2 rounded-lg font-bold text-black"
            >
              {isListening ? 'Listening...' : 'Listen & Detect'}
            </button>
          </>
        ) : (
          <div className="flex items-center gap-6 animate-in zoom-in">
             <div className="text-center">
                <div className="text-xs text-slate-500 uppercase font-bold">Key</div>
                <div className="text-3xl font-bold text-cyan-400">{detectedContext.key}</div>
             </div>
             <div className="h-10 w-[1px] bg-white/10"></div>
             <div className="text-center">
                <div className="text-xs text-slate-500 uppercase font-bold">BPM</div>
                <div className="text-3xl font-bold text-purple-400">{detectedContext.bpm}</div>
             </div>
          </div>
        )}
      </div>

      {/* 2. Style & Generation (Only if context detected) */}
      {detectedContext && (
        <div className="glass-panel p-6 rounded-2xl">
           <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-white flex items-center gap-2"><Radio className="w-4 h-4" /> Select Vibe</h3>
              {isLoadingTrack && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              {STYLES.map(style => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={`p-3 rounded-xl text-xs font-bold transition-all relative overflow-hidden ${selectedStyle === style.id ? 'text-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'bg-slate-800 text-slate-400'}`}
                >
                   <div className={`absolute inset-0 opacity-20 ${style.color}`}></div>
                   {selectedStyle === style.id && <div className={`absolute bottom-0 left-0 h-1 w-full ${style.color}`}></div>}
                   <span className="relative z-10">{style.label}</span>
                </button>
              ))}
           </div>
           
           <button 
             onClick={handleGenerate}
             className="w-full bg-slate-700 hover:bg-slate-600 py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2"
           >
             <Music2 className="w-4 h-4" /> Generate Backing Track
           </button>
        </div>
      )}

      {/* 3. Looper Deck */}
      {backingTrack && (
        <div className="glass-panel p-6 rounded-2xl border-t-4 border-t-purple-500">
           <div className="flex justify-between items-center mb-6">
              <div>
                 <h3 className="text-xl font-bold text-white">Live Looper</h3>
                 <p className="text-xs text-purple-400 font-mono">TRACK: {backingTrack.style} // {backingTrack.bpm} BPM</p>
              </div>
              <div className="flex gap-2">
                 <button 
                   onClick={() => setIsPlaying(!isPlaying)}
                   className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isPlaying ? 'bg-cyan-500 text-black' : 'bg-slate-700 text-white'}`}
                 >
                    {isPlaying ? <Square className="fill-current w-4 h-4" /> : <Play className="fill-current w-4 h-4 ml-1" />}
                 </button>
              </div>
           </div>

           {/* Sequencer Visualizer */}
           <div className="flex gap-1 mb-6 h-8">
              {Array.from({length: 16}).map((_, i) => (
                <div key={i} className={`flex-1 rounded-sm transition-all ${i === currentStep ? 'bg-cyan-400 shadow-[0_0_10px_cyan]' : 'bg-slate-800'}`}></div>
              ))}
           </div>

           {/* Loop Controls */}
           <div className="flex items-center gap-4 bg-black/40 p-4 rounded-xl border border-white/5">
              <button 
                 onClick={toggleLoopRecording}
                 className={`flex-1 py-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${isLoopRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 hover:bg-slate-700 text-red-400'}`}
              >
                 <div className={`w-3 h-3 rounded-full ${isLoopRecording ? 'bg-white' : 'bg-red-500'}`}></div>
                 {isLoopRecording ? 'RECORDING LOOP...' : 'REC OVERDUB'}
              </button>
              
              {hasRecordedLoop && (
                <div className="flex items-center gap-2 px-4 py-2 bg-purple-900/30 rounded-lg border border-purple-500/30 text-purple-300 text-xs font-bold">
                   <Repeat className="w-4 h-4" /> <span>LOOP ACTIVE</span>
                   <button onClick={() => { audio.stopLoop(); setHasRecordedLoop(false); }} className="ml-2 hover:text-white">✕</button>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};
