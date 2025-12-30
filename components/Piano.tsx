import React, { useMemo, useEffect, useRef, useState } from 'react';
import { TheoryData } from '../types';
import { audio } from '../services/audioEngine';
import { PlayCircle, Usb, Circle } from 'lucide-react';

interface PianoProps {
  data: TheoryData | null;
  tuning: number; // Master tuning (e.g. 440)
  targetNotes?: string[]; // For Practice Mode
  onPlayNote?: (note: string) => void; // New callback for scoring
  midiEnabled: boolean; // New prop to control MIDI activation
  midiStatus: 'connected' | 'disconnected' | 'unsupported'; // New prop for MIDI status
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
  const midi = (octave + 1) * 12 + noteIndex;
  const offset = midi - 69; // Offset from A4 (MIDI 69)
  return tuning * Math.pow(2, offset / 12);
};

const midiToFreq = (midiNote: number, tuning: number) => {
  return tuning * Math.pow(2, (midiNote - 69) / 12);
};

const freqToNoteString = (freq: number, tuning: number): string => {
  const midi = 69 + 12 * Math.log2(freq / tuning);
  const roundedMidi = Math.round(midi);
  const noteIndex = roundedMidi % 12;
  const octave = Math.floor(roundedMidi / 12) - 1;
  return `${NOTES_SHARP[noteIndex]}${octave}`;
};

const normalize = (note: string) => note.replace(/[0-9]/g, '').trim();

// Keyboard Map: Z X C V B N M ,  (White) | S D G H J (Black)
const KEYBOARD_MAP: Record<string, string> = {
  'z': 'C3', 's': 'C#3', 'x': 'D3', 'd': 'D#3', 'c': 'E3', 'v': 'F3', 'g': 'F#3',
  'b': 'G3', 'h': 'G#3', 'n': 'A3', 'j': 'A#3', 'm': 'B3', ',': 'C4',
  'q': 'C4', '2': 'C#4', 'w': 'D4', '3': 'D#4', 'e': 'E4', 'r': 'F4', '5': 'F#4',
  't': 'G4', '6': 'G#4', 'y': 'A4', '7': 'A#4', 'u': 'B4'
};

interface ActiveNoteInstance {
  fullNote: string;
  activeNoteRef: any; // Reference to the object returned by audio.playNote
}

export const Piano: React.FC<PianoProps> = ({ data, tuning, targetNotes = [], onPlayNote, midiEnabled, midiStatus }) => {
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [lastPlayedNote, setLastPlayedNote] = useState<string | null>(null);
  const activeKeyInstances = useRef<Map<string, ActiveNoteInstance>>(new Map()); // Map fullNote string to ActiveNoteInstance

  const getIntervalColor = (interval: string) => {
    if (interval === 'R' || interval === '1') return 'text-amber-500 font-black'; // Root
    if (interval.includes('3')) return 'text-emerald-500'; // Third
    if (interval.includes('5')) return 'text-purple-500'; // Fifth
    return 'text-white/70'; // Other intervals
  };

  const whiteKeys = useMemo(() => {
    const keys = [];
    for (let octave = 2; octave <= 5; octave++) {
      ['C', 'D', 'E', 'F', 'G', 'A', 'B'].forEach(note => {
        if (!['C2', 'B5'].includes(`${note}${octave}`)) { 
           keys.push({ note, octave, type: 'white' });
        }
      });
    }
    return keys;
  }, []);

  const blackKeys = useMemo(() => {
    const keys = [];
    for (let octave = 2; octave <= 5; octave++) {
      ['C#', 'D#', 'F#', 'G#', 'A#'].forEach(note => {
        if (!['C#2', 'D#2', 'F#2', 'G#2', 'A#2', 'C#5', 'D#5', 'F#5', 'G#5', 'A#5'].includes(`${note}${octave}`)) {
            keys.push({ note, octave, type: 'black' });
        }
      });
    }
    return keys;
  }, []);

  const allKeys = useMemo(() => {
    return [...whiteKeys, ...blackKeys].sort((a, b) => {
      const freqA = getFrequency(a.note, a.octave, tuning);
      const freqB = getFrequency(b.note, b.octave, tuning);
      return freqA - freqB;
    });
  }, [whiteKeys, blackKeys, tuning]);

  const getNoteColor = (fullNote: string) => {
    if (!data) return '';
    const normalizedDataNote = toSharp(normalize(fullNote));
    const dataNotesNormalized = data.notes.map(n => toSharp(normalize(n)));
    const index = dataNotesNormalized.indexOf(normalizedDataNote);

    if (index !== -1) {
      return getIntervalColor(data.intervals[index]);
    }
    return '';
  };

  // --- Note Playback Logic ---
  const startNote = (fullNote: string, freq: number, velocity: number = 1.0) => {
    // If note is already playing from another source (e.g. keyboard then MIDI), stop it first
    if (activeKeyInstances.current.has(fullNote)) {
      audio.stopNote(activeKeyInstances.current.get(fullNote)!.activeNoteRef);
      activeKeyInstances.current.delete(fullNote);
    }
    
    const activeNoteRef = audio.playNote(freq, velocity); // No duration means it sustains
    activeKeyInstances.current.set(fullNote, { fullNote, activeNoteRef });

    setLastPlayedNote(fullNote);
    if (onPlayNote) onPlayNote(fullNote);
    
    setActiveNotes(prev => new Set(prev.add(fullNote)));
  };

  const stopNote = (fullNote: string) => {
    const activeInstance = activeKeyInstances.current.get(fullNote);
    if (activeInstance) {
      audio.stopNote(activeInstance.activeNoteRef);
      activeKeyInstances.current.delete(fullNote);
    }

    setActiveNotes(prev => {
      const newSet = new Set(prev);
      newSet.delete(fullNote);
      return newSet;
    });
  };

  const playNoteByStr = (noteStr: string, velocity: number = 1.0) => {
    const match = noteStr.match(/([A-G]#?b?)([0-9])/);
    if (!match) return;

    const noteName = match[1];
    const octave = parseInt(match[2]);
    const freq = getFrequency(noteName, octave, tuning);
    
    startNote(noteStr, freq, velocity);
  };
  
  const handleManualPlay = (noteName: string, octave: number, velocity: number = 1.0) => {
    const fullNote = `${noteName}${octave}`;
    const freq = getFrequency(noteName, octave, tuning);
    
    startNote(fullNote, freq, velocity);
  };

  // --- MIDI Input ---
  useEffect(() => {
    const handleMidiMessage = (message: MIDIMessageEvent) => {
      const command = message.data[0] & 0xf0;
      const midiNoteNumber = message.data[1];
      const freq = midiToFreq(midiNoteNumber, tuning);
      const fullNote = freqToNoteString(freq, tuning);
      const velocity = message.data[2];

      if (command === 0x90 && velocity > 0) { // Note On
        setLastPlayedNote(fullNote);
        if (onPlayNote) onPlayNote(fullNote);
        setActiveNotes(prev => new Set(prev.add(fullNote)));
      } else if (command === 0x80 || (command === 0x90 && velocity === 0)) { // Note Off
        setActiveNotes(prev => {
          const newSet = new Set(prev);
          newSet.delete(fullNote);
          return newSet;
        });
      }
    };

    if (midiEnabled) {
      audio.subscribeToMidiMessages(handleMidiMessage);
      audio.startMidiInput();
    } else {
      audio.stopMidiInput();
      audio.unsubscribeFromMidiMessages(handleMidiMessage);
    }

    return () => {
      audio.stopMidiInput();
      audio.unsubscribeFromMidiMessages(handleMidiMessage);
    };
  }, [midiEnabled, tuning, onPlayNote]);

  // --- Keyboard Listener (Computer Keyboard) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const note = KEYBOARD_MAP[e.key.toLowerCase()];
      if (note && !activeNotes.has(note)) {
        playNoteByStr(note);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const note = KEYBOARD_MAP[e.key.toLowerCase()];
      if (note) {
        stopNote(note);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeNotes, tuning, onPlayNote]);

  return (
    <div className="relative overflow-x-auto pb-4 custom-scrollbar">
      <div className="flex-none w-fit mx-auto relative select-none" style={{ minWidth: `${whiteKeys.length * 40}px` }}>
        {/* White Keys */}
        {whiteKeys.map((key, i) => {
          const fullNote = `${key.note}${key.octave}`;
          const isActive = activeNotes.has(fullNote);
          const isTarget = targetNotes.includes(fullNote);
          const isDataNote = data?.notes.some(n => toSharp(normalize(n)) === toSharp(normalize(fullNote)));
          const extraClasses = isTarget ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.7)] animate-pulse' : '';

          return (
            <div
              key={fullNote}
              onMouseDown={() => handleManualPlay(key.note, key.octave)}
              onMouseUp={() => stopNote(fullNote)}
              onMouseLeave={() => isActive && stopNote(fullNote)} // Ensure note stops if mouse leaves while held
              className={`
                piano-key relative float-left w-10 h-40 bg-white border border-t-0 border-slate-700 rounded-b-md cursor-pointer 
                shadow-[inset_0_-2px_8px_rgba(0,0,0,0.2)] hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]
                ${isActive ? 'key-active bg-cyan-600 !shadow-[0_0_20px_rgba(6,182,212,0.7)]' : ''}
                ${isDataNote && !isTarget && !isActive ? 'bg-white/10' : ''} 
                ${extraClasses}
              `}
              aria-label={`Play ${fullNote}`}
              role="button"
              tabIndex={0}
            >
              <span className={`absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-bold ${getNoteColor(fullNote)}`}>
                {key.note}{key.octave}
                {isTarget && <PlayCircle className="w-3 h-3 inline-block ml-1" />}
              </span>
            </div>
          );
        })}

        {/* Black Keys */}
        {blackKeys.map((key, i) => {
          const fullNote = `${key.note}${key.octave}`;
          const isActive = activeNotes.has(fullNote);
          const isTarget = targetNotes.includes(fullNote);
          const isDataNote = data?.notes.some(n => toSharp(normalize(n)) === toSharp(normalize(fullNote)));
          const extraClasses = isTarget ? 'bg-red-700 shadow-[0_0_20px_rgba(239,68,68,0.7)] animate-pulse' : '';

          return (
            <div
              key={fullNote}
              onMouseDown={() => handleManualPlay(key.note, key.octave)}
              onMouseUp={() => stopNote(fullNote)}
              onMouseLeave={() => isActive && stopNote(fullNote)}
              className={`
                piano-key relative float-left w-8 h-24 bg-black border-slate-900 rounded-b-md cursor-pointer -ml-4 mr-1.5 
                shadow-[inset_0_-2px_8px_rgba(255,255,255,0.1)] hover:shadow-[0_0_15px_rgba(0,0,0,0.5)]
                ${isActive ? 'key-active bg-cyan-900 !shadow-[0_0_20px_rgba(6,182,212,0.7)]' : ''}
                ${isDataNote && !isTarget && !isActive ? 'bg-black/30' : ''}
                ${extraClasses}
              `}
              style={{ zIndex: 1 }}
              aria-label={`Play ${fullNote}`}
              role="button"
              tabIndex={0}
            >
              <span className={`absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-bold ${getNoteColor(fullNote)}`}>
                {key.note}{key.octave}
                {isTarget && <PlayCircle className="w-3 h-3 inline-block ml-1" />}
              </span>
            </div>
          );
        })}
      </div>
      {/* MIDI Status Indicator */}
      <div className="absolute top-4 left-4 p-2 bg-black/40 rounded-lg flex items-center gap-2 text-xs font-mono border border-white/10">
          <Usb className={`w-4 h-4 ${midiStatus === 'connected' ? 'text-emerald-400' : midiStatus === 'disconnected' ? 'text-yellow-400' : 'text-slate-500'}`} />
          <span className={`${midiStatus === 'connected' ? 'text-emerald-300' : midiStatus === 'disconnected' ? 'text-yellow-300' : 'text-slate-500'}`}>
              MIDI: {midiStatus.toUpperCase()}
          </span>
      </div>
    </div>
  );
};