
import React, { useState } from 'react';
import { TheoryData } from '../types';

interface Props {
  currentRoot: string;
  onSelectKey: (key: string) => void;
  data: TheoryData | null;
}

const KEYS = [
  { major: 'C', minor: 'Am', idx: 0 },
  { major: 'G', minor: 'Em', idx: 1 },
  { major: 'D', minor: 'Bm', idx: 2 },
  { major: 'A', minor: 'F#m', idx: 3 },
  { major: 'E', minor: 'C#m', idx: 4 },
  { major: 'B', minor: 'G#m', idx: 5 },
  { major: 'F#', minor: 'D#m', idx: 6 },
  { major: 'Db', minor: 'Bbm', idx: 7 },
  { major: 'Ab', minor: 'Fm', idx: 8 },
  { major: 'Eb', minor: 'Cm', idx: 9 },
  { major: 'Bb', minor: 'Gm', idx: 10 },
  { major: 'F', minor: 'Dm', idx: 11 },
];

// Helper to normalize keys for comparison (Enharmonic Equivalence)
const normalizeKey = (k: string): string => {
    const map: Record<string, string> = {
        'C#': 'Db', 'G#': 'Ab', 'D#': 'Eb', 'A#': 'Bb', 'F#': 'Gb',
        'Gb': 'F#', // We standardize on the Circle's labels for visual matching. 
        // Actually, let's normalize everything to the Circle's specific labels:
        // C, G, D, A, E, B, F#, Db, Ab, Eb, Bb, F
    };
    // Special handling for the F#/Gb split at 6 o'clock
    if (k === 'Gb') return 'F#';
    if (k === 'C#') return 'Db';
    if (k === 'G#') return 'Ab';
    if (k === 'D#') return 'Eb';
    if (k === 'A#') return 'Bb';
    return k;
};

export const CircleOfFifths: React.FC<Props> = ({ currentRoot, onSelectKey, data }) => {
  const [hovered, setHovered] = useState<number | null>(null);

  // Geometry (Coordinate System 300x300)
  const size = 300;
  const center = size / 2;
  const outerRadius = 140;
  const innerRadius = 90;
  const textRadiusMajor = 115;
  const textRadiusMinor = 70;

  // Helper to polar coordinates
  const getPos = (angleDeg: number, radius: number) => {
    const angleRad = (angleDeg - 90) * (Math.PI / 180);
    return {
      x: center + radius * Math.cos(angleRad),
      y: center + radius * Math.sin(angleRad),
    };
  };

  const createSectorPath = (startIdx: number, endIdx: number, rInner: number, rOuter: number) => {
    const startAngle = startIdx * 30 - 15;
    const endAngle = endIdx * 30 - 15;
    
    const p1 = getPos(startAngle, rOuter);
    const p2 = getPos(endAngle, rOuter);
    const p3 = getPos(endAngle, rInner);
    const p4 = getPos(startAngle, rInner);

    // Large arc flag is 0 because 30 degrees is small
    return `M ${p1.x} ${p1.y} A ${rOuter} ${rOuter} 0 0 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rInner} ${rInner} 0 0 0 ${p4.x} ${p4.y} Z`;
  };

  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-purple-500 opacity-50"></div>
      
      <div className="flex justify-between w-full mb-4 items-center relative z-10">
         <h3 className="text-sm font-bold text-white uppercase tracking-widest">Harmonic Circle</h3>
         <div className="text-[10px] text-cyan-400 font-mono">KEY NAVIGATOR</div>
      </div>

      <div className="relative w-full max-w-[300px] aspect-square mx-auto">
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-cyan-500/5 rounded-full blur-3xl transform scale-75"></div>

        <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="transform transition-transform duration-700 hover:rotate-0">
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          
          {/* Center Hub */}
          <circle cx={center} cy={center} r={40} fill="#0f172a" stroke="#334155" strokeWidth="1" />
          <text x={center} y={center} textAnchor="middle" dy="5" className="text-xs fill-slate-500 font-mono tracking-widest">FIFTHS</text>

          {/* Sectors */}
          {KEYS.map((k, i) => {
             const isHovered = hovered === i;
             
             // Check against both Major and Minor relative
             const rootNorm = data ? normalizeKey(data.root) : '';
             const isSelected = rootNorm === k.major || rootNorm === normalizeKey(k.minor.replace('m', ''));
             
             // Dynamic Colors
             let fillColor = "rgba(30, 41, 59, 0.5)"; // Default Slate
             let strokeColor = "rgba(148, 163, 184, 0.2)";
             
             if (isSelected) {
                 fillColor = "rgba(6, 182, 212, 0.2)"; // Cyan active
                 strokeColor = "#22d3ee";
             } else if (isHovered) {
                 fillColor = "rgba(255, 255, 255, 0.1)";
             }

             // Text Position
             const posMajor = getPos(i * 30, textRadiusMajor);
             const posMinor = getPos(i * 30, textRadiusMinor);

             return (
               <g 
                 key={k.major} 
                 onClick={() => onSelectKey(k.major)}
                 onMouseEnter={() => setHovered(i)}
                 onMouseLeave={() => setHovered(null)}
                 className="cursor-pointer transition-all duration-300"
               >
                 <path 
                   d={createSectorPath(i, i+1, innerRadius - 30, outerRadius)} 
                   fill={fillColor} 
                   stroke={strokeColor}
                   strokeWidth={isSelected ? 2 : 1}
                   className="transition-all duration-300"
                 />
                 
                 {/* Connector Line if Selected (Theory vis) */}
                 {isSelected && (
                    <line x1={center} y1={center} x2={posMajor.x} y2={posMajor.y} stroke="#22d3ee" strokeWidth="1" strokeDasharray="2 2" />
                 )}

                 <text 
                   x={posMajor.x} 
                   y={posMajor.y} 
                   textAnchor="middle" 
                   dy="4" 
                   className={`text-[12px] font-bold pointer-events-none transition-all ${isSelected ? 'fill-white text-shadow-glow text-[14px]' : 'fill-slate-400'}`}
                 >
                   {k.major}
                 </text>
                 
                 <text 
                   x={posMinor.x} 
                   y={posMinor.y} 
                   textAnchor="middle" 
                   dy="4" 
                   className={`text-[9px] pointer-events-none transition-all ${isSelected ? 'fill-cyan-300' : 'fill-slate-600'}`}
                 >
                   {k.minor}
                 </text>
               </g>
             );
          })}
        </svg>

        {/* Floating Info Overlay */}
        {hovered !== null && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center">
                <div className="text-2xl font-black text-white">{KEYS[hovered].major}</div>
                <div className="text-xs text-cyan-400">Relative: {KEYS[hovered].minor}</div>
            </div>
        )}
      </div>
    </div>
  );
};
