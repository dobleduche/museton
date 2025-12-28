import React, { useMemo, useEffect, useRef, useState } from 'react';
import { TheoryData } from '../types';
import { audio } from '../services/audioEngine';
import { PlayCircle } from 'lucide-react';

interface PianoProps {
  data: TheoryData | null;
  tuning: number; // Master tuning (e.g. 440)
  targetNotes?: string[]; // For Practice Mode
  onPlayNote?: (note: string) => void; // New callback for scoring
}

const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Helper to convert flats to sharps for visualization mapping
const toSharp = (note: string): string => {
  const map: Record<string, string> = {
    'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
    'Cb': 'B', 'Fb': 'E', 'E#': 'F', 'B#': 'C'
  };
  return map[note] || note;
};

// Dynamic Frequency Calculation based on Tuning
const getFrequency = (note: string, octave: number, tuning: number) => {
  const sharpNote = toSharp(note);
  const noteIndex = NOTES_SHARP.indexOf(sharpNote); 
  // Formula: Freq = Tuning * 2^((n - 49) / 12) where n is MIDI note number.
  // A4 (Octave 4, Index 9) is MIDI 69.
  // Our C0 starts MIDI 12.
  const midi = (octave + 1) * 12 + noteIndex;
  // A4 is 69.
  // Offset from A4:
  const offset = midi - 69;
  return tuning * Math.pow(2, offset / 12);
};

const normalize = (note: string) => note.replace(/[0-9]/g, '').trim();

// Keyboard Map: Z X C V B N M ,  (White) | S D G H J (Black)
const KEYBOARD_MAP: Record<string, string> = {
  'z': 'C3', 's': 'C#3', 'x': 'D3', 'd': 'D#3', 'c': 'E3', 'v': 'F3', 'g': 'F#3',
  'b': 'G3', 'h': 'G#3', 'n': 'A3', 'j': 'A#3', 'm': 'B3', ',': 'C4',
  'q': 'C4', '2': 'C#4', 'w': 'D4', '3': 'D#4', 'e': 'E4', 'r': 'F4', '5': 'F#4',
  't': 'G4', '6': 'G#4', 'y': 'A4', '7': 'A#4', 'u': 'B4'
};

const getIntervalColor = (interval: string) => {
  if (interval === 'R' || interval === '1') return 'text-amber-500 font-black'; // Root
  if (interval.includes('3')) return 'text-cyan-500 font-bold'; // Thirds
  if (interval.includes('5')) return 'text-purple-500 font-bold'; // Fifths
  if (interval.includes('7')) return 'text-pink-500 font-bold'; // Sevenths
  return 'text-slate-400 font-medium'; // Extensions/Others
};

const getKeyStyle = (interval: string | null, isBlack: boolean, isPlaying: boolean, isTarget: boolean) => {
    // 1. Playing State (Highest Priority)
    if (isPlaying) {
        return isBlack 
            ? 'from-slate-700 to-cyan-900 key-active border-cyan-500/50' 
            : 'bg-cyan-100 key-active !border-b-0 !shadow-none';
    }

    // 2. Practice Mode Target (Next Priority)
    if (isTarget) {
        return isBlack
            ? 'border-red-500/50 from-red-900/60 to-black animate-pulse'
            : 'bg-red-50 shadow-[inset_0_-20px_40px_rgba(239,68,68,0.2)] !border-b-red-400 animate-pulse';
    }

    // 3. Inactive/Default
    if (!interval) {
        return isBlack ? '' : 'hover:bg-gray-50';
    }

    // 4. Theory Interval Colors
    let type = 'default';
    if (interval === 'R' || interval === '1') type = 'root';
    else if (interval.includes('3')) type = 'third';
    else if (interval.includes('5')) type = 'fifth';
    else if (interval.includes('7')) type = 'seventh';

    if (isBlack) {
        switch (type) {
            case 'root': return 'from-amber-900/60 to-black border-b-2 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]';
            case 'third': return 'from-cyan-900/60 to-black border-b-2 border-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.4)]';
            case 'fifth': return 'from-purple-900/60 to-black border-b-2 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]';
            case 'seventh': return 'from-pink-900/60 to-black border-b-2 border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.4)]';
            default: return 'border-b-2 border-indigo-500 from-indigo-900/40 to-black';
        }
    } else {
        switch (type) {
            case 'root': return 'bg-amber-50 shadow-[inset_0_-20px_40px_rgba(245,158,11,0.3)] border-b-4 border-amber-400';
            case 'third': return 'bg-cyan-50 shadow-[inset_0_-20px_40px_rgba(6,182,212,0.3)] border-b-4 border-cyan-400';
            case 'fifth': return 'bg-purple-50 shadow-[inset_0_-20px_40px_rgba(168,85,247,0.3)] border-b-4 border-purple-400';
            case 'seventh': return 'bg-pink-50 shadow-[inset_0_-20px_40px_rgba(236,72,153,0.3)] border-b-4 border-pink-400';
            default: return 'bg-indigo-50 shadow-[inset_0_-20px_40px_rgba(99,102,241,0.2)]';
        }
    }
};

export const Piano: React.FC<PianoProps> = ({ data, tuning = 440, targetNotes = [], onPlayNote }) => {
  const startOctave = 3;
  const octaveCount = 2;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [playingKeys, setPlayingKeys] = useState<Set<string>>(new Set());

  // Audio Visualizer
  useEffect(() => {
    let animationId: number;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const analyser = audio.analyser;
      const draw = () => {
        animationId = requestAnimationFrame(draw);
        if (!analyser || !ctx) return;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#22d3ee';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#22d3ee';
        ctx.beginPath();
        const sliceWidth = canvas.width / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * canvas.height) / 2;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();
      };
      draw();
    }
    return () => cancelAnimationFrame(animationId);
  }, []);

  const playNoteByStr = (noteWithOctave: string) => {
    // noteWithOctave like "C3" or "F#4"
    const match = noteWithOctave.match(/([A-G]#?)([0-9])/);
    if (match) {
      const note = match[1];
      const oct = parseInt(match[2]);
      const freq = getFrequency(note, oct, tuning);
      audio.playNote(freq);
      if (onPlayNote) onPlayNote(noteWithOctave);
    }
  };

  const handleManualPlay = (keyName: string, octave: number, keyId: string) => {
    const freq = getFrequency(keyName, octave, tuning);
    audio.playNote(freq);
    if (onPlayNote) onPlayNote(keyId);
    
    setPlayingKeys(prev => new Set(prev).add(keyId));
    setTimeout(() => {
      setPlayingKeys(prev => {
        const next = new Set(prev);
        next.delete(keyId);
        return next;
      });
    }, 200);
  };

  // Auto-Play Scale Sequence
  const handleAutoPlay = async () => {
      if (!data) return;
      
      // Map theory notes to real keys (starting from C3 area)
      const baseOctave = 3;
      
      const sequence: { note: string, oct: number }[] = [];
      let currentOctave = baseOctave;
      let lastIndex = -1;

      data.notes.forEach(n => {
          const norm = normalize(n);
          // Convert to sharp to find position in standard octave array
          const sharpNorm = toSharp(norm);
          const index = NOTES_SHARP.indexOf(sharpNorm);
          
          if (index < lastIndex) currentOctave++;
          lastIndex = index;
          // Use the original name for display if possible, but sharp for ID mapping
          sequence.push({ note: sharpNorm, oct: currentOctave });
      });

      // Play Sequence
      for (let i = 0; i < sequence.length; i++) {
          const item = sequence[i];
          const keyId = `${item.note}${item.oct}`;
          handleManualPlay(item.note, item.oct, keyId);
          await new Promise(r => setTimeout(r, 400)); // Delay
      }
      
      // Play Chord if it's a chord type
      if (data.type === 'chord') {
          await new Promise(r => setTimeout(r, 400));
          sequence.forEach(item => {
              const freq = getFrequency(item.note, item.oct, tuning);
              audio.playNote(freq);
              const keyId = `${item.note}${item.oct}`;
              setPlayingKeys(prev => new Set(prev).add(keyId));
          });
          setTimeout(() => setPlayingKeys(new Set()), 1000);
      }
  };

  // Keyboard Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return; // Ignore hold
      const key = e.key.toLowerCase();
      if (KEYBOARD_MAP[key]) {
        const mapped = KEYBOARD_MAP[key]; // e.g., "C3"
        playNoteByStr(mapped);
        setPlayingKeys(prev => new Set(prev).add(mapped));
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (KEYBOARD_MAP[key]) {
        const mapped = KEYBOARD_MAP[key];
        setPlayingKeys(prev => {
           const next = new Set(prev);
           next.delete(mapped);
           return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [tuning]); 

  // Helper to find interval from Theory Data with Enharmonic Check
  const getInterval = (keyName: string) => {
    if (!data) return null;
    
    // We compare the KEY (always sharp in our map, e.g., "C#") to DATA (might be "Db")
    // So we normalize DATA notes to SHARP
    const index = data.notes.findIndex(n => toSharp(normalize(n)) === keyName);
    return index !== -1 ? data.intervals[index] : null;
  };

  // Generate Key Objects
  const keys = useMemo(() => {
    const generatedKeys = [];
    for (let o = 0; o < octaveCount; o++) {
      const octaveNum = startOctave + o;
      for (let i = 0; i < 12; i++) {
        const isSharp = NOTES_SHARP[i].includes('#');
        generatedKeys.push({
          noteIndex: i,
          octave: octaveNum,
          primaryName: NOTES_SHARP[i],
          isBlack: isSharp,
          id: `${NOTES_SHARP[i]}${octaveNum}`
        });
      }
    }
    // High C
    generatedKeys.push({ noteIndex: 0, octave: startOctave + octaveCount, primaryName: 'C', isBlack: false, id: `C${startOctave + octaveCount}` });
    return generatedKeys;
  }, []);

  return (
    <div className="relative w-full glass-panel rounded-2xl overflow-hidden group perspective-[1200px] border border-white/10">
      {/* Visualizer Header */}
      <div className="h-20 bg-black/40 border-b border-white/5 relative flex items-center justify-center overflow-hidden">
        <canvas ref={canvasRef} width={600} height={80} className="absolute inset-0 w-full h-full opacity-80" />
        <div className="absolute inset-0 scanline opacity-20"></div>
        <div className="absolute top-2 left-3 text-[10px] text-cyan-500/50 font-mono tracking-[0.2em] flex gap-2 z-10">
           <span>OSCILLATOR VISUALIZATION</span>
           <span className="text-white/30">|</span>
           <span>TUNING: {tuning}Hz</span>
           <span className="animate-pulse ml-2 text-cyan-400">● REC READY</span>
        </div>
        
        {/* Auto Play Button */}
        {data && (
            <button 
                onClick={handleAutoPlay}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-cyan-900/40 hover:bg-cyan-500 hover:text-black text-cyan-400 border border-cyan-500/30 rounded-full px-4 py-2 flex items-center gap-2 text-xs font-bold transition-all z-20"
            >
                <PlayCircle className="w-4 h-4" /> PREVIEW
            </button>
        )}
      </div>
      
      {/* Keys Container */}
      <div className="relative h-64 flex justify-center px-4 pt-2 bg-gradient-to-b from-slate-900/90 to-black/80 backdrop-blur-md">
        <div className="relative flex h-full shadow-2xl">
          {/* White Keys */}
          {keys.filter(k => !k.isBlack).map((key) => {
             const isPlaying = playingKeys.has(key.id);
             const interval = getInterval(key.primaryName);
             const isTarget = targetNotes.includes(key.id) || targetNotes.some(t => toSharp(normalize(t)) === key.primaryName);
             
             return (
               <div
                 key={key.id}
                 onMouseDown={() => handleManualPlay(key.primaryName, key.octave, key.id)}
                 onTouchStart={(e) => { e.preventDefault(); handleManualPlay(key.primaryName, key.octave, key.id); }}
                 className={`
                   relative w-12 md:w-16 h-full 
                   bg-white/95 backdrop-blur-sm
                   border-x border-b border-slate-300/50 rounded-b-lg mx-[1px]
                   shadow-[inset_0_-15px_20px_rgba(0,0,0,0.1),0_5px_5px_rgba(0,0,0,0.2)]
                   transition-all duration-75 ease-out
                   flex flex-col justify-end items-center pb-4 cursor-pointer
                   piano-key z-10
                   ${getKeyStyle(interval, false, isPlaying, isTarget)}
                 `}
               >
                  <div className="flex flex-col items-center pointer-events-none">
                    {interval && !isTarget && (
                      <span className={`text-[10px] mb-1 ${getIntervalColor(interval)}`}>{interval}</span>
                    )}
                    <span className={`text-[10px] font-bold ${isPlaying ? 'text-cyan-600' : 'text-slate-400'}`}>
                      {key.primaryName}
                    </span>
                  </div>
               </div>
             );
          })}
        </div>
        
        {/* Black Keys */}
        <div className="absolute inset-0 flex justify-center pointer-events-none px-4 pt-2">
           <div className="relative flex h-full">
              {keys.filter(k => !k.isBlack).map((wKey) => {
                 const hasBlack = ['C', 'D', 'F', 'G', 'A'].includes(wKey.primaryName);
                 const blackKeyObj = hasBlack 
                    ? keys.find(k => k.isBlack && k.octave === wKey.octave && k.primaryName.startsWith(wKey.primaryName)) 
                    : null;
                 
                 const isPlaying = blackKeyObj ? playingKeys.has(blackKeyObj.id) : false;
                 
                 const interval = blackKeyObj ? getInterval(blackKeyObj.primaryName) : null;
                 const isTarget = blackKeyObj && (targetNotes.includes(blackKeyObj.id) || targetNotes.some(t => toSharp(normalize(t)) === blackKeyObj.primaryName));

                 return (
                   <div key={`spacer-${wKey.id}`} className="w-12 md:w-16 h-full relative pointer-events-none mx-[1px]">
                      {hasBlack && blackKeyObj && (
                        <div 
                          onMouseDown={(e) => {
                             e.stopPropagation();
                             handleManualPlay(blackKeyObj.primaryName, blackKeyObj.octave, blackKeyObj.id);
                          }}
                          onTouchStart={(e) => {
                             e.preventDefault();
                             e.stopPropagation();
                             handleManualPlay(blackKeyObj.primaryName, blackKeyObj.octave, blackKeyObj.id);
                          }}
                          className={`
                          absolute z-20 top-0 -right-2.5 md:-right-3 w-5 md:w-6 h-[66%] 
                          rounded-b-md border-x border-b border-slate-900 
                          shadow-[3px_6px_10px_rgba(0,0,0,0.7),inset_1px_0_2px_rgba(255,255,255,0.2)]
                          pointer-events-auto
                          flex flex-col justify-end items-center pb-3 cursor-pointer
                          bg-gradient-to-b from-slate-800 via-black to-black
                          piano-key
                          ${getKeyStyle(interval, true, isPlaying, !!isTarget)}
                        `}>
                           {interval && !isTarget && (
                              <span className={`text-[8px] mb-0.5 pointer-events-none ${getIntervalColor(interval)}`}>{interval}</span>
                           )}
                           {isTarget && <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mb-1 pointer-events-none"></div>}
                        </div>
                      )}
                   </div>
                 );
              })}
           </div>
        </div>
      </div>
    </div>
  );
};