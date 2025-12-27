import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Save, FolderOpen, Trash2, Merge, RefreshCw, Plus, Settings2, Zap, GraduationCap, CheckCircle } from 'lucide-react';
import { BeatProject, SavedProject } from '../types';
import { audio } from '../services/audioEngine';
import { db } from '../services/db';

interface Props {
  project: BeatProject;
  onUpdate: (p: BeatProject) => void;
  onGenerateAI: (prompt: string) => void;
}

const LESSONS = [
    { id: 1, title: "4-on-the-Floor (House)", genre: "House", bpm: 120, desc: "The foundation of dance music. Kick on every beat.", pattern: { kick: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], snare: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], hat: [0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0], clap: [] } },
    { id: 2, title: "Basic Rock Beat", genre: "Rock", bpm: 100, desc: "Kick on 1 & 3, Snare on 2 & 4.", pattern: { kick: [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0], snare: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], hat: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], clap: [] } },
    { id: 3, title: "Trap Hi-Hats", genre: "Trap", bpm: 140, desc: "Fast hats with sparse kicks.", pattern: { kick: [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0], snare: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], hat: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], clap: [] } },
];

export const Sequencer: React.FC<Props> = ({ project, onUpdate, onGenerateAI }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [aiPrompt, setAiPrompt] = useState("");
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [mode, setMode] = useState<'LOAD' | 'MERGE'>('LOAD');
  const [activePad, setActivePad] = useState<string | null>(null);
  
  // Lesson Mode State
  const [showLessons, setShowLessons] = useState(false);
  const [activeLesson, setActiveLesson] = useState<typeof LESSONS[0] | null>(null);

  // Refs for precise scheduling
  const nextNoteTime = useRef(0);
  const currentStepRef = useRef(0);
  const timerID = useRef<number | null>(null);
  
  // Ref for project data to be accessible inside the scheduler closure
  const projectRef = useRef(project);
  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  // Load Saved Projects
  useEffect(() => {
    const load = async () => {
      const projs = await db.getProjects();
      setSavedProjects(projs);
    };
    load();
  }, [showLoadModal]);

  // --- AUDIO SCHEDULER ---
  const scheduleNote = (stepNumber: number, time: number) => {
    const currentProject = projectRef.current;
    if (!currentProject.patterns) return;
    
    // We add a tiny offset for visual feedback queue if we were using Tone.js, 
    // but here we just trigger audio. The visual loop will catch up.
    if (currentProject.patterns.kick[stepNumber]) audio.playDrum('KICK', time, 1.0);
    if (currentProject.patterns.snare[stepNumber]) audio.playDrum('SNARE', time, 1.0);
    if (currentProject.patterns.hat[stepNumber]) audio.playDrum('HAT', time, 1.0);
    if (currentProject.patterns.clap[stepNumber]) audio.playDrum('CLAP', time, 1.0);
  };

  const nextStep = () => {
    const secondsPerBeat = 60.0 / projectRef.current.bpm;
    // 16th notes = 0.25 beats
    nextNoteTime.current += 0.25 * secondsPerBeat;
    currentStepRef.current = (currentStepRef.current + 1) % 16;
  };

  const scheduler = () => {
    // Lookahead: 100ms
    const scheduleAheadTime = 0.1;
    const ctx = audio.getContext();
    if (!ctx) return;

    while (nextNoteTime.current < ctx.currentTime + scheduleAheadTime) {
      scheduleNote(currentStepRef.current, nextNoteTime.current);
      nextStep();
    }
    timerID.current = window.setTimeout(scheduler, 25);
  };

  // --- VISUAL LOOP ---
  // Decoupled from audio scheduling for smoothness
  useEffect(() => {
      let visualId: number;
      const draw = () => {
          const ctx = audio.getContext();
          if (isPlaying && ctx) {
              // Calculate visually where we are based on time
              // This is a bit complex to reverse engineer exactly without state drift,
              // so we can fallback to just polling the ref which is updated by the scheduler.
              // For a 16 step sequencer, strict visual sync is less critical than audio sync.
              // We'll update state when the ref changes to keep it simple but functional.
              // Note: This might render slightly *ahead* of the sound because scheduler is ahead.
              // To fix, we would use a Draw Queue. For now, we accept the slight visual lead (~50ms).
              setCurrentStep(currentStepRef.current);
          }
          visualId = requestAnimationFrame(draw);
      };
      
      if (isPlaying) {
          const ctx = audio.getContext();
          if (ctx) {
             if (ctx.state === 'suspended') ctx.resume();
             nextNoteTime.current = ctx.currentTime + 0.05; // Start slightly in future
             currentStepRef.current = 0;
             scheduler();
             draw();
          }
      } else {
          if (timerID.current) window.clearTimeout(timerID.current);
      }

      return () => {
          if (timerID.current) window.clearTimeout(timerID.current);
          cancelAnimationFrame(visualId);
      };
  }, [isPlaying]);

  const toggleStep = (inst: 'kick' | 'snare' | 'hat' | 'clap', index: number) => {
    if (!project.patterns) return;
    const newPattern = [...project.patterns[inst]];
    newPattern[index] = !newPattern[index];
    onUpdate({
      ...project,
      patterns: { ...project.patterns, [inst]: newPattern }
    });
  };

  const handleManualTrigger = (inst: 'kick' | 'snare' | 'hat' | 'clap') => {
      audio.playDrum(inst.toUpperCase() as any, undefined, 1.0);
      setActivePad(inst);
      setTimeout(() => setActivePad(null), 100);
  }

  const handleSave = async () => {
    const name = prompt("Name your beat:", project.title);
    if (name) {
      await db.saveProject({ ...project, title: name });
      alert("Project saved!");
    }
  };

  const loadLesson = (lesson: typeof LESSONS[0]) => {
      setActiveLesson(lesson);
      // Convert lesson binary pattern to boolean pattern
      const patterns: any = { kick: [], snare: [], hat: [], clap: new Array(16).fill(false) };
      ['kick', 'snare', 'hat'].forEach(inst => {
          // @ts-ignore
          patterns[inst] = lesson.pattern[inst].map(n => n === 1);
      });
      
      onUpdate({
          ...project,
          title: `Lesson: ${lesson.title}`,
          bpm: lesson.bpm,
          genre: lesson.genre,
          patterns
      });
      setShowLessons(false);
  };

  const handleProjectAction = (saved: SavedProject) => {
    if (mode === 'LOAD') {
      onUpdate(saved.data);
    } else {
      // Merge: Combine true steps
      const current = project.patterns!;
      const incoming = saved.data.patterns!;
      const merged = {
        kick: current.kick.map((v, i) => v || incoming.kick[i]),
        snare: current.snare.map((v, i) => v || incoming.snare[i]),
        hat: current.hat.map((v, i) => v || incoming.hat[i]),
        clap: current.clap.map((v, i) => v || incoming.clap[i]),
      };
      onUpdate({ ...project, patterns: merged });
    }
    setShowLoadModal(false);
  };
  
  const handleDelete = async (id: number) => {
    if (confirm("Are you sure?")) {
      await db.deleteProject(id);
      const projs = await db.getProjects();
      setSavedProjects(projs);
    }
  }

  const tracks = [
    { id: 'kick', color: 'bg-cyan-500', glow: 'shadow-[0_0_15px_cyan]', label: 'KICK' },
    { id: 'snare', color: 'bg-purple-500', glow: 'shadow-[0_0_15px_purple]', label: 'SNARE' },
    { id: 'hat', color: 'bg-yellow-500', glow: 'shadow-[0_0_15px_yellow]', label: 'HI-HAT' },
    { id: 'clap', color: 'bg-pink-500', glow: 'shadow-[0_0_15px_pink]', label: 'CLAP' },
  ];

  return (
    <div className="bg-[#111] border border-[#333] p-6 rounded-2xl animate-in fade-in shadow-2xl relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header / Controls */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6 border-b border-white/5 pb-6">
        <div className="flex items-center gap-6">
           <button 
             onClick={() => setIsPlaying(!isPlaying)}
             className={`w-16 h-16 rounded-xl flex items-center justify-center transition-all border-2 ${
                 isPlaying 
                 ? 'bg-cyan-500 border-cyan-400 text-black shadow-[0_0_30px_rgba(6,182,212,0.4)]' 
                 : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
             }`}
           >
             {isPlaying ? <Square className="w-6 h-6 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
           </button>
           
           <div>
              <input 
                value={project.title}
                onChange={(e) => onUpdate({...project, title: e.target.value})}
                className="bg-transparent text-2xl font-black text-white focus:outline-none uppercase tracking-tighter w-full"
              />
              <div className="flex items-center gap-4 mt-1">
                 <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded border border-white/10">
                    <span className="text-[10px] text-slate-500 font-bold">BPM</span>
                    <input 
                        type="number" 
                        value={project.bpm}
                        onChange={(e) => onUpdate({...project, bpm: parseInt(e.target.value)})}
                        className="w-12 bg-transparent text-cyan-400 font-mono font-bold text-sm focus:outline-none text-right"
                    />
                 </div>
                 <div className="flex items-center gap-2">
                    <Zap className="w-3 h-3 text-yellow-500" />
                    <span className="text-xs text-slate-400 font-bold">{project.genre}</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Global Controls */}
        <div className="flex gap-2">
           <button onClick={() => setShowLessons(true)} className="px-4 py-2 bg-gradient-to-r from-purple-900 to-slate-900 border border-purple-500/30 rounded hover:from-purple-800 text-purple-300 text-xs font-bold tracking-wide transition-all flex items-center gap-2">
             <GraduationCap className="w-3 h-3" /> BEAT ACADEMY
           </button>
           <div className="w-[1px] h-8 bg-[#333] mx-2"></div>
           <button onClick={handleSave} className="px-4 py-2 bg-[#222] border border-[#444] rounded hover:bg-[#333] text-slate-300 text-xs font-bold tracking-wide transition-all">
             SAVE
           </button>
           <button onClick={() => { setMode('LOAD'); setShowLoadModal(true); }} className="px-4 py-2 bg-[#222] border border-[#444] rounded hover:bg-[#333] text-slate-300 text-xs font-bold tracking-wide transition-all">
             LOAD
           </button>
        </div>
      </div>
      
      {/* Lesson Description Overlay if Active */}
      {activeLesson && (
          <div className="mb-6 p-4 bg-purple-900/10 border border-purple-500/20 rounded-xl flex justify-between items-center">
              <div>
                  <h4 className="text-purple-400 font-bold text-sm">ACTIVE LESSON: {activeLesson.title}</h4>
                  <p className="text-slate-400 text-xs">{activeLesson.desc}</p>
              </div>
              <button onClick={() => setActiveLesson(null)} className="text-xs text-slate-500 hover:text-white">Exit Lesson</button>
          </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
          
          {/* MPC PADS (Audition) */}
          <div className="grid grid-cols-2 gap-3 w-full lg:w-48 shrink-0">
              {tracks.map(track => (
                  <button
                    key={track.id}
                    onMouseDown={() => handleManualTrigger(track.id as any)}
                    className={`
                        aspect-square rounded-lg border-2 flex items-end p-2 transition-all duration-75 relative overflow-hidden group
                        ${activePad === track.id 
                            ? `${track.color} border-white text-white translate-y-1 shadow-[0_0_20px_currentColor]` 
                            : 'bg-[#1a1a1a] border-[#333] text-slate-500 hover:border-[#555] hover:text-slate-300'
                        }
                    `}
                  >
                      <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 ${track.color}`}></div>
                      <span className="text-[10px] font-black uppercase tracking-wider">{track.label}</span>
                  </button>
              ))}
          </div>

          {/* SEQUENCER GRID */}
          <div className="flex-1 overflow-x-auto custom-scrollbar pb-2">
            <div className="space-y-3 min-w-[600px]">
                {/* Step Indicators */}
                <div className="flex gap-1 ml-[80px] mb-2">
                    {Array.from({length: 16}).map((_, i) => (
                        <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${currentStep === i ? 'bg-white shadow-[0_0_10px_white]' : 'bg-[#222]'}`}></div>
                    ))}
                </div>

                {tracks.map(track => (
                <div key={track.id} className="flex items-center gap-4 group">
                    <div className="w-[64px] text-right">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-white transition-colors">{track.label}</div>
                    </div>
                    <div className="flex-1 flex gap-1.5 relative">
                        {/* Playhead Laser */}
                        <div 
                            className="absolute top-0 bottom-0 w-0.5 bg-white/50 z-10 pointer-events-none transition-all duration-75"
                            style={{ left: `calc(${(currentStep / 16) * 100}% + ${currentStep * 0.15}%)` }} // Micro adjustment for gap
                        ></div>

                        {project.patterns && project.patterns[track.id as 'kick'].map((active, i) => (
                            <button
                            key={i}
                            onClick={() => toggleStep(track.id as any, i)}
                            className={`
                                flex-1 h-12 rounded relative transition-all duration-150
                                ${active 
                                    ? `${track.color} ${track.glow} opacity-90 hover:opacity-100 hover:scale-105` 
                                    : 'bg-[#1a1a1a] hover:bg-[#252525]'
                                }
                                ${i % 4 === 0 && !active ? 'border-l-2 border-l-white/10' : ''}
                            `}
                            >
                                {active && <div className="absolute inset-x-1 top-1 h-[2px] bg-white/50 rounded-full"></div>}
                            </button>
                        ))}
                    </div>
                </div>
                ))}
            </div>
          </div>
      </div>

      {/* AI Controls - Integrated Style */}
      <div className="mt-8 pt-6 border-t border-white/5 flex items-center gap-4">
         <div className="flex items-center gap-2 text-cyan-500">
             <RefreshCw className="w-4 h-4" />
             <span className="text-xs font-bold">AI GENERATOR</span>
         </div>
         <div className="flex-1 bg-[#0a0a0a] rounded-lg border border-[#333] flex items-center p-1 focus-within:border-cyan-500/50 transition-colors">
            <input 
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe a beat... 'Hard hitting 140bpm dubstep', 'Chill lofi study beat'"
                className="flex-1 bg-transparent px-3 text-sm text-white placeholder-slate-600 focus:outline-none"
            />
            <button 
                onClick={() => onGenerateAI(aiPrompt)}
                className="px-4 py-1.5 bg-cyan-900/30 text-cyan-400 rounded hover:bg-cyan-500 hover:text-black text-xs font-bold transition-all"
            >
                GENERATE
            </button>
         </div>
      </div>

      {/* Lesson Selection Modal */}
      {showLessons && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6 w-full max-w-2xl shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><GraduationCap className="w-6 h-6 text-purple-400"/> Beat Academy</h3>
                    <button onClick={() => setShowLessons(false)} className="text-slate-400 hover:text-white">Close</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {LESSONS.map(lesson => (
                        <div key={lesson.id} onClick={() => loadLesson(lesson)} className="p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-purple-900/20 hover:border-purple-500/50 cursor-pointer transition-all">
                            <div className="flex justify-between mb-2">
                                <span className="font-bold text-white">{lesson.title}</span>
                                <span className="text-xs bg-purple-900 text-purple-200 px-2 py-0.5 rounded">{lesson.genre}</span>
                            </div>
                            <p className="text-xs text-slate-400">{lesson.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
          </div>
      )}

      {/* Load Modal */}
      {showLoadModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-4">{mode === 'LOAD' ? 'Load Project' : 'Merge Project'}</h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                 {savedProjects.length === 0 && <p className="text-slate-500 italic">No saved projects.</p>}
                 {savedProjects.map(p => (
                   <div key={p.id} className="flex items-center justify-between p-3 rounded bg-white/5 hover:bg-white/10">
                      <div>
                         <div className="font-bold text-white">{p.data.title}</div>
                         <div className="text-xs text-slate-500">{new Date(p.timestamp).toLocaleDateString()}</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleProjectAction(p)} className="text-cyan-400 text-xs font-bold px-3 py-1 bg-cyan-950 rounded border border-cyan-800">
                           {mode}
                        </button>
                        <button onClick={() => handleDelete(p.id!)} className="text-red-400 p-1 hover:text-red-300">
                           <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                   </div>
                 ))}
              </div>
              <button onClick={() => setShowLoadModal(false)} className="mt-4 w-full py-2 bg-slate-800 rounded text-slate-300">Close</button>
           </div>
        </div>
      )}
    </div>
  );
};