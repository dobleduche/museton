
import React, { useState, useEffect } from 'react';
import { Sliders, Activity, Zap, Save, Download, Trash2, X, Check, Search } from 'lucide-react';
import { SynthConfig } from '../types';
import { db } from '../services/db';

interface Props {
  config: SynthConfig;
  onChange: (updates: Partial<SynthConfig>) => void;
}

interface SavedPreset {
  id: number;
  name: string;
  config: SynthConfig;
  timestamp: Date;
}

export const SynthPanel: React.FC<Props> = ({ config, onChange }) => {
  const waves: Array<SynthConfig['waveform']> = ['sine', 'triangle', 'sawtooth', 'square'];
  
  // UI States
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showSaveUI, setShowSaveUI] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<SavedPreset[]>([]);
  
  // Load Logic
  const loadPresets = async () => {
    const p = await db.getSynthPresets();
    // Sort by newest first
    setPresets(p.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
  };

  useEffect(() => {
    if (showLoadModal) loadPresets();
  }, [showLoadModal]);

  // Save Logic
  const initiateSave = () => {
      setPresetName(`Patch ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`);
      setShowSaveUI(true);
  };

  const confirmSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!presetName.trim()) return;

    await db.saveSynthPreset(presetName, config);
    setShowSaveUI(false);
    setPresetName("");
  };

  const handleLoad = (p: SavedPreset) => {
    onChange(p.config);
    setShowLoadModal(false);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Permanently delete this patch?")) {
      await db.deleteSynthPreset(id);
      loadPresets();
    }
  };
  
  // Double click reset helpers
  const resetEnv = (param: keyof SynthConfig, defaultVal: number) => {
      onChange({ [param]: defaultVal });
  }

  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row gap-8 border-t border-white/10 relative overflow-hidden min-h-[320px]">
        {/* Rack Ears (Visual) */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1 h-24 bg-gradient-to-b from-slate-800 via-slate-600 to-slate-800 rounded-full shadow-inner"></div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1 h-24 bg-gradient-to-b from-slate-800 via-slate-600 to-slate-800 rounded-full shadow-inner"></div>

        {/* Decorative Screws */}
        <div className="absolute top-4 left-2 w-2 h-2 rounded-full bg-slate-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]"></div>
        <div className="absolute bottom-4 left-2 w-2 h-2 rounded-full bg-slate-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]"></div>
        <div className="absolute top-4 right-2 w-2 h-2 rounded-full bg-slate-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]"></div>
        <div className="absolute bottom-4 right-2 w-2 h-2 rounded-full bg-slate-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]"></div>

        {/* Header & Controls */}
        <div className="absolute top-3 left-6 right-6 flex justify-between items-center z-10">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Zap className="w-3 h-3 text-cyan-500" /> Synthesizer Rack
            </h3>
            <div className="flex gap-2">
                <button 
                    onClick={initiateSave} 
                    className="text-[9px] font-bold flex items-center gap-1 bg-slate-800 hover:bg-cyan-900/50 text-cyan-400 px-3 py-1.5 rounded border border-cyan-500/30 transition-all hover:scale-105"
                >
                   <Save className="w-3 h-3" /> SAVE PATCH
                </button>
                <button 
                    onClick={() => setShowLoadModal(true)} 
                    className="text-[9px] font-bold flex items-center gap-1 bg-slate-800 hover:bg-white/10 text-slate-300 px-3 py-1.5 rounded border border-white/10 transition-all hover:scale-105"
                >
                   <Download className="w-3 h-3" /> LOAD PATCH
                </button>
            </div>
        </div>

        {/* 1. Waveform Select */}
        <div className="flex-1 min-w-[150px] pt-8 border-r border-white/5 pr-4">
            <div className="text-[9px] text-slate-500 uppercase font-bold mb-3 text-center tracking-wider">Oscillator 1</div>
            <div className="grid grid-cols-2 gap-2">
                {waves.map(w => (
                    <button
                        key={w}
                        onClick={() => onChange({ waveform: w })}
                        className={`
                            h-14 rounded border flex flex-col items-center justify-center transition-all duration-200
                            ${config.waveform === w 
                                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.2)] scale-105' 
                                : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                            }
                        `}
                    >
                        {/* Wave Icons */}
                        <div className="w-6 h-4 mb-1 border-b border-current opacity-80">
                            {w === 'sine' && <div className="w-full h-full rounded-[100%] border-t border-current"></div>}
                            {w === 'square' && <div className="w-full h-2 border-t border-x border-current"></div>}
                            {w === 'triangle' && <div className="w-full h-full border-l border-r border-transparent border-b-current" style={{borderLeftWidth:'12px', borderRightWidth:'12px', borderBottomWidth:'16px'}}></div>}
                            {w === 'sawtooth' && <div className="w-full h-full border-r border-t border-current skew-y-12"></div>}
                        </div>
                        <span className="text-[8px] uppercase font-bold">{w}</span>
                    </button>
                ))}
            </div>
        </div>

        {/* 2. Filter Section */}
        <div className="flex-1 min-w-[180px] pt-8 px-4 flex flex-col gap-6 border-r border-white/5">
             <div className="text-[9px] text-slate-500 uppercase font-bold mb-1 text-center tracking-wider">VCF (Filter)</div>
             
             <div className="space-y-2 group" title="Double click to reset">
                <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                    <span>CUTOFF</span>
                    <span className="text-cyan-400 font-mono">{Math.round(config.filterCutoff)} Hz</span>
                </div>
                <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                     <input 
                        type="range" min="100" max="10000" step="100"
                        value={config.filterCutoff}
                        onDoubleClick={() => onChange({ filterCutoff: 2000 })}
                        onChange={(e) => onChange({ filterCutoff: Number(e.target.value) })}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="h-full bg-cyan-500 transition-all" style={{width: `${(config.filterCutoff / 10000) * 100}%`}}></div>
                </div>
             </div>

             <div className="space-y-2 group" title="Double click to reset">
                <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                    <span>RESONANCE</span>
                    <span className="text-purple-400 font-mono">{config.filterResonance.toFixed(1)}</span>
                </div>
                <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                    <input 
                        type="range" min="0" max="20" step="0.5"
                        value={config.filterResonance}
                        onDoubleClick={() => onChange({ filterResonance: 0 })}
                        onChange={(e) => onChange({ filterResonance: Number(e.target.value) })}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="h-full bg-purple-500 transition-all" style={{width: `${(config.filterResonance / 20) * 100}%`}}></div>
                </div>
             </div>
        </div>

        {/* 3. ADSR Envelopes */}
        <div className="flex-[2] pt-8 pl-4">
            <div className="text-[9px] text-slate-500 uppercase font-bold mb-4 text-center tracking-wider">Amplitude Envelope</div>
            <div className="flex justify-between gap-4 h-32 items-end px-6 bg-black/20 rounded-xl border border-white/5 py-4 relative shadow-inner">
                {/* Background Grid */}
                <div className="absolute inset-0 pointer-events-none opacity-10" 
                     style={{backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
                </div>

                {[
                    { id: 'attack', label: 'ATTACK', max: 2, step: 0.01, val: config.attack, col: 'bg-emerald-500', def: 0.01 },
                    { id: 'decay', label: 'DECAY', max: 2, step: 0.01, val: config.decay, col: 'bg-emerald-500', def: 0.1 },
                    { id: 'sustain', label: 'SUSTAIN', max: 1, step: 0.01, val: config.sustain, col: 'bg-yellow-500', def: 0.6 },
                    { id: 'release', label: 'RELEASE', max: 5, step: 0.1, val: config.release, col: 'bg-pink-500', def: 1.5 },
                ].map((p) => (
                    <div key={p.id} className="flex flex-col items-center gap-3 h-full w-full z-10" title={`Value: ${p.val}`}>
                        <div className="relative w-2 h-full bg-slate-800 rounded-full shadow-inner ring-1 ring-white/5">
                            <input 
                                type="range" 
                                min="0" max={p.max} step={p.step}
                                value={p.val}
                                onDoubleClick={() => resetEnv(p.id as any, p.def)}
                                onChange={(e) => onChange({ [p.id]: Number(e.target.value) })}
                                className="absolute -left-4 top-0 w-[140px] h-[140px] -rotate-90 origin-top-left opacity-0 cursor-pointer z-20"
                                style={{ transform: 'rotate(-90deg) translate(-100%, 0)' }} 
                            />
                            {/* Visual Fader Handle */}
                            <div 
                                className={`absolute bottom-0 w-6 h-3 -left-2 rounded shadow-[0_0_10px_currentColor] transition-all pointer-events-none ${p.col} flex items-center justify-center`}
                                style={{ bottom: `${Math.min(95, (p.val / p.max) * 100)}%` }}
                            >
                                <div className="w-full h-[1px] bg-white/50"></div>
                            </div>
                            {/* Fill */}
                            <div className={`absolute bottom-0 w-full rounded-full opacity-30 ${p.col}`} style={{height: `${(p.val / p.max) * 100}%`}}></div>
                        </div>
                        <span className="text-[8px] font-bold text-slate-400 tracking-wider">{p.label.charAt(0)}</span>
                    </div>
                ))}
            </div>
        </div>

        {/* SAVE OVERLAY */}
        {showSaveUI && (
             <div className="absolute inset-0 z-30 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95">
                <div className="w-full max-w-sm bg-black/40 border border-white/10 p-6 rounded-2xl shadow-2xl">
                    <h3 className="font-bold text-white mb-4 text-center flex items-center justify-center gap-2">
                        <Save className="w-4 h-4 text-cyan-400" /> NAME YOUR PATCH
                    </h3>
                    <form onSubmit={confirmSave} className="space-y-4">
                        <input 
                            autoFocus
                            value={presetName}
                            onChange={e => setPresetName(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                            placeholder="e.g. Deep Bass Wobble"
                        />
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setShowSaveUI(false)} className="flex-1 py-3 text-xs font-bold bg-slate-800 text-slate-400 rounded-lg hover:text-white transition-colors">CANCEL</button>
                            <button type="submit" className="flex-1 py-3 text-xs font-bold bg-cyan-600 text-black rounded-lg hover:bg-cyan-500 transition-colors shadow-[0_0_15px_rgba(6,182,212,0.3)]">SAVE PRESET</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* LOAD MODAL */}
        {showLoadModal && (
            <div className="absolute inset-0 z-30 bg-slate-900/95 backdrop-blur-md flex flex-col p-6 animate-in fade-in">
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                        <Download className="w-4 h-4 text-emerald-400" /> LOAD PRESET
                    </h3>
                    <button onClick={() => setShowLoadModal(false)} className="bg-slate-800 p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                    {presets.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
                            <Sliders className="w-8 h-8 mb-2" />
                            <span className="text-xs">No user presets found.</span>
                        </div>
                    )}
                    {presets.map(p => (
                        <div 
                            key={p.id} 
                            onClick={() => handleLoad(p)}
                            className="flex items-center justify-between p-3 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-cyan-500/30 rounded-xl cursor-pointer group transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-cyan-500 font-bold text-xs border border-white/5">
                                    P{p.id % 99}
                                </div>
                                <div>
                                    <div className="text-sm text-white font-bold group-hover:text-cyan-400 transition-colors">{p.name}</div>
                                    <div className="text-[10px] text-slate-500 font-mono">
                                        {p.config.waveform.toUpperCase()} • {new Date(p.timestamp).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                                className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                title="Delete Preset"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
};
