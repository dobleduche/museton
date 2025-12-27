import React, { useState } from 'react';
import { TheoryData } from '../types';
import { audio } from '../services/audioEngine';
import { Music, Zap, Disc } from 'lucide-react';

interface GuitarProps {
  data: TheoryData | null;
  tuning?: number;
  targetNotes?: string[];
  onPlayNote?: (note: string) => void;
}

// Standard E Tuning (Low to High)
const STRINGS = [
  { note: 'E', octave: 2, baseMidi: 40, gauge: 4 }, // Thickest
  { note: 'A', octave: 2, baseMidi: 45, gauge: 3.2 },
  { note: 'D', octave: 3, baseMidi: 50, gauge: 2.4 },
  { note: 'G', octave: 3, baseMidi: 55, gauge: 1.6 },
  { note: 'B', octave: 3, baseMidi: 59, gauge: 1.2 },
  { note: 'E', octave: 4, baseMidi: 64, gauge: 1 },  // Thinnest
];

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FRETS = 13; // 0 to 12

const normalize = (note: string) => note.replace(/[0-9]/g, '').trim();

// Convert flats to sharps for comparison
const toSharp = (note: string): string => {
  const map: Record<string, string> = {
    'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
    'Cb': 'B', 'Fb': 'E', 'E#': 'F', 'B#': 'C'
  };
  return map[note] || note;
};

// Realistic Fret Spacing Math (0 is Nut)
const getFretPositionPerc = (fretIndex: number) => {
    // 0 = Nut (Left Edge)
    // 1 = Fret 1 Wire
    if (fretIndex === 0) return 0;
    
    // Scale length L
    // Position d = L - (L / 2^(n/12))
    const pos = 1 - Math.pow(2, -fretIndex / 12);
    // Scale so Fret 12 is at ~95% to leave room
    const maxPos = 1 - Math.pow(2, -12 / 12); // 0.5
    
    // Normalize 0..0.5 to 0..100%
    return (pos / maxPos) * 98; 
};

export const Guitar: React.FC<GuitarProps> = ({ data, tuning = 440, targetNotes = [], onPlayNote }) => {
  const [hoveredNote, setHoveredNote] = useState<string | null>(null);
  const [lastPlayed, setLastPlayed] = useState<string | null>(null);
  const [vibratingString, setVibratingString] = useState<number | null>(null);

  const getNoteAtFret = (stringIndex: number, fret: number) => {
    const stringData = STRINGS[stringIndex];
    const midi = stringData.baseMidi + fret;
    const noteIndex = midi % 12;
    const octave = Math.floor(midi / 12) - 1; 
    const name = NOTES[noteIndex];
    return { name, octave, midi, id: `${name}${octave}` };
  };

  const playString = (stringIndex: number, fret: number) => {
    const { midi, id } = getNoteAtFret(stringIndex, fret);
    const freq = tuning * Math.pow(2, (midi - 69) / 12);
    audio.playNote(freq);
    
    setLastPlayed(id);
    setVibratingString(stringIndex);
    if (onPlayNote) onPlayNote(id);
    
    setTimeout(() => setLastPlayed(null), 300);
    setTimeout(() => setVibratingString(null), 200);
  };

  const getTheoryInfo = (noteName: string) => {
    if (!data) return null;
    const norm = toSharp(normalize(noteName));
    const index = data.notes.findIndex(n => toSharp(normalize(n)) === norm);
    if (index === -1) return null;
    return { interval: data.intervals[index], isRoot: toSharp(normalize(data.root)) === norm };
  };

  return (
    <div className="relative w-full glass-panel rounded-2xl overflow-hidden border border-white/10 p-6 shadow-2xl">
      <div className="flex justify-between items-center mb-6">
         <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-500/30">
                <Music className="w-5 h-5 text-amber-500" />
            </div>
            <div>
                <h3 className="text-white font-bold text-lg leading-none">Fretboard Visualizer</h3>
                <span className="text-amber-500/80 font-mono text-[10px] tracking-widest uppercase">Standard E Tuning</span>
            </div>
         </div>
         <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 text-[10px] bg-black/40 px-3 py-1.5 rounded border border-white/5 font-mono text-slate-400">
                 <Disc className="w-3 h-3 text-cyan-500 animate-spin-slow" />
                 TUNING: <span className="text-cyan-400 font-bold">{tuning}Hz</span>
             </div>
         </div>
      </div>

      <div className="relative overflow-x-auto pb-4 custom-scrollbar">
        {/* Fretboard Container */}
        {/* Added pl-12 to make room for Nut/Open Strings */}
        <div className="relative min-w-[800px] h-[260px] bg-[#1a1816] rounded-xl shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] border-y-4 border-[#2a2520] select-none overflow-hidden pl-12">
           
           {/* Wood Texture */}
           <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/80 pointer-events-none z-0"></div>
           <div className="absolute inset-0 opacity-20 pointer-events-none z-0" style={{backgroundImage: 'url("https://www.transparenttextures.com/patterns/wood-pattern.png")'}}></div>

           {/* The Nut (Bone) */}
           <div className="absolute left-10 top-0 bottom-0 w-2 bg-[#e5e5e5] shadow-lg z-10"></div>

           {/* Frets (Wires) */}
           {Array.from({ length: FRETS - 1 }).map((_, i) => {
             // i=0 is Fret 1 Wire
             const fretNum = i + 1;
             const pos = getFretPositionPerc(fretNum);
             const prevPos = getFretPositionPerc(fretNum - 1);
             const centerPos = (pos + prevPos) / 2;

             return (
               <React.Fragment key={`fret-wire-${fretNum}`}>
                   {/* Wire */}
                   <div 
                    className="absolute top-0 bottom-0 w-1 bg-gradient-to-r from-slate-400 via-slate-200 to-slate-500 shadow-[2px_0_4px_rgba(0,0,0,0.5)] z-10"
                    style={{ left: `${pos}%` }}
                   />
                   
                   {/* Number */}
                   <span className="absolute bottom-1 text-[9px] text-[#716657] font-mono font-bold -translate-x-1/2" style={{ left: `${centerPos}%` }}>
                       {fretNum}
                   </span>

                   {/* Inlays */}
                   {(fretNum === 3 || fretNum === 5 || fretNum === 7 || fretNum === 9) && (
                     <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#cbbfae] shadow-inner opacity-40 blur-[1px]" style={{ left: `${centerPos}%` }}></div>
                   )}
                   {fretNum === 12 && (
                     <>
                       <div className="absolute top-[30%] -translate-x-1/2 w-4 h-4 rounded-full bg-[#cbbfae] shadow-inner opacity-40 blur-[1px]" style={{ left: `${centerPos}%` }}></div>
                       <div className="absolute top-[70%] -translate-x-1/2 w-4 h-4 rounded-full bg-[#cbbfae] shadow-inner opacity-40 blur-[1px]" style={{ left: `${centerPos}%` }}></div>
                     </>
                   )}
               </React.Fragment>
             );
           })}

           {/* Strings & Nodes */}
           {STRINGS.map((str, stringIndex) => {
             // Vertical Layout: Low E at bottom
             const verticalPos = 85 - (stringIndex * 14.5); 
             const isVibrating = vibratingString === stringIndex;

             return (
               <div key={`str-${stringIndex}`} className="absolute left-0 right-0 h-full pointer-events-none z-20">
                  {/* String Line */}
                  <div 
                    className={`absolute w-full bg-gradient-to-b from-[#e5e7eb] to-[#9ca3af] shadow-[0_2px_4px_rgba(0,0,0,0.5)] transition-transform ${isVibrating ? 'animate-pulse' : ''}`}
                    style={{ 
                      top: `${verticalPos}%`, 
                      height: `${str.gauge}px`,
                      opacity: 0.95,
                      transform: isVibrating ? 'scaleY(1.5)' : 'scaleY(1)'
                    }}
                  ></div>

                  {/* Interactive Nodes */}
                  {Array.from({ length: FRETS }).map((_, fret) => {
                    const noteInfo = getNoteAtFret(stringIndex, fret);
                    const theoryInfo = getTheoryInfo(noteInfo.name);
                    
                    const isTarget = targetNotes.includes(noteInfo.id) || targetNotes.some(t => toSharp(normalize(t)) === noteInfo.name);
                    const isActive = !!theoryInfo || isTarget;
                    const isRoot = theoryInfo?.isRoot;
                    const isPlayed = lastPlayed === noteInfo.id;
                    
                    // Position
                    let leftPos;
                    if (fret === 0) {
                        // Open string: Place before Nut
                        leftPos = "20px"; // Fixed pixels for Nut area
                    } else {
                        const right = getFretPositionPerc(fret);
                        const left = getFretPositionPerc(fret - 1);
                        leftPos = `${(right + left) / 2}%`;
                    }

                    return (
                      <div
                        key={`node-${stringIndex}-${fret}`}
                        onClick={() => playString(stringIndex, fret)}
                        onMouseEnter={() => setHoveredNote(noteInfo.id)}
                        onMouseLeave={() => setHoveredNote(null)}
                        className={`
                          absolute pointer-events-auto cursor-pointer rounded-full flex items-center justify-center
                          transition-all duration-150 z-30 -translate-x-1/2 -translate-y-1/2
                          ${isActive ? 'w-7 h-7 opacity-100 scale-100' : 'w-5 h-5 opacity-0 hover:opacity-100 scale-90'}
                          ${isActive && isRoot ? 'bg-amber-500 text-black shadow-[0_0_15px_orange]' : ''}
                          ${isActive && !isRoot && !isTarget ? 'bg-cyan-600 text-white shadow-[0_0_10px_cyan]' : ''}
                          ${!isActive ? 'bg-white/20 backdrop-blur-md border border-white/40' : ''}
                          ${isTarget && !isRoot ? 'bg-red-500 text-white shadow-[0_0_15px_red] animate-pulse' : ''}
                          ${isPlayed ? 'scale-125 ring-4 ring-white/50 brightness-150' : ''}
                        `}
                        style={{
                          left: leftPos,
                          top: `${verticalPos}%`
                        }}
                      >
                         {/* Note Label */}
                         {(isActive || hoveredNote === noteInfo.id) && (
                             <div className="flex flex-col items-center leading-none">
                                <span className="text-[9px] font-black">{noteInfo.name}</span>
                                {isActive && !isTarget && <span className="text-[7px] opacity-90 font-mono">{theoryInfo?.interval}</span>}
                             </div>
                         )}
                         {isTarget && <Zap className="w-3 h-3 fill-current" />}
                      </div>
                    );
                  })}
               </div>
             );
           })} 
        </div>
      </div>
      
      {/* Legend Footer */}
      <div className="mt-4 flex justify-between items-center px-4 bg-black/20 p-3 rounded-lg border border-white/5">
         <div className="text-xs text-slate-400 font-mono">
            {hoveredNote ? (
                <span className="text-cyan-400 font-bold text-sm tracking-wider flex items-center gap-2">
                    NOTE: {hoveredNote}
                </span>
            ) : "HOVER FRETS TO IDENTIFY • CLICK TO PLAY"}
         </div>
         <div className="flex gap-6 text-[9px] text-slate-500 font-bold uppercase tracking-widest">
             <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_10px_orange]"></div> Root Note</div>
             <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-cyan-600 shadow-[0_0_10px_cyan]"></div> Scale Tone</div>
             <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div> Target</div>
         </div>
      </div>
    </div>
  );
};