import React, { useState } from 'react';
import { Settings, Volume2, Database, Sliders, X, Check, Activity, Trash2, Gauge, Usb } from 'lucide-react';
import { UserPreferences } from '../types';
import { audio } from '../services/audioEngine';

interface Props {
  prefs: UserPreferences;
  onUpdate: (prefs: Partial<UserPreferences>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<Props> = ({ prefs, onUpdate, onClose }) => {
  const [activeTab, setActiveTab] = useState<'TOOLS' | 'AUDIO' | 'DATA'>('TOOLS');
  const [metronomeOn, setMetronomeOn] = useState(false);
  const [bpm, setBpm] = useState(120);

  const toggleMetronome = () => {
      const isOn = audio.toggleMetronome(bpm);
      setMetronomeOn(isOn);
  }

  const handleClearData = () => {
      if (confirm("DANGER: This will wipe all local projects and presets. Continue?")) {
          localStorage.clear();
          window.location.reload();
      }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[500px]">
            
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-800">
                <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-white font-bold">Workstation Preferences</h2>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-48 bg-black/20 border-r border-white/5 p-4 space-y-1">
                    {[
                        { id: 'TOOLS', label: 'Basic Tools', icon: Sliders },
                        { id: 'AUDIO', label: 'Audio Engine', icon: Volume2 },
                        { id: 'DATA', label: 'Memory & Data', icon: Database },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-cyan-900/30 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <tab.icon className="w-4 h-4" /> {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-slate-900">
                    
                    {/* Basic Tools: Metronome */}
                    {activeTab === 'TOOLS' && (
                        <div className="space-y-6">
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-emerald-400" /> Global Metronome
                                </h3>
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={toggleMetronome}
                                        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${metronomeOn ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-slate-700 text-slate-400'}`}
                                    >
                                        <Activity className={`w-6 h-6 ${metronomeOn ? 'animate-pulse' : ''}`} />
                                    </button>
                                    <div className="flex-1">
                                        <div className="flex justify-between mb-2">
                                            <span className="text-xs text-slate-400">TEMPO</span>
                                            <span className="text-xl font-bold text-emerald-400">{bpm} BPM</span>
                                        </div>
                                        <input 
                                            type="range" min="40" max="240" 
                                            value={bpm}
                                            onChange={(e) => {
                                                const v = Number(e.target.value);
                                                setBpm(v);
                                                if(metronomeOn) audio.toggleMetronome(v);
                                            }}
                                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                                <h3 className="text-sm font-bold text-white mb-4">UI Density</h3>
                                <div className="flex gap-2">
                                    {['neon', 'minimal'].map(theme => (
                                        <button 
                                            key={theme}
                                            onClick={() => onUpdate({ theme: theme as any })}
                                            className={`flex-1 py-2 rounded border text-xs font-bold uppercase ${prefs.theme === theme ? 'bg-white text-black border-white' : 'bg-transparent border-slate-600 text-slate-500'}`}
                                        >
                                            {theme}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Audio Prefs */}
                    {activeTab === 'AUDIO' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-bold text-white mb-2">Master Tuning (A4)</h3>
                                <div className="flex items-center gap-4 bg-slate-800 p-3 rounded-lg">
                                    <input 
                                        type="number" 
                                        value={prefs.masterTuning}
                                        onChange={(e) => onUpdate({ masterTuning: Number(e.target.value) })}
                                        className="bg-transparent text-xl font-bold text-white w-20 focus:outline-none"
                                    />
                                    <span className="text-slate-500 text-xs">Hz (Standard: 440Hz)</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                                <div>
                                    <div className="text-sm font-bold text-white">Performance Mode</div>
                                    <div className="text-xs text-slate-500">Reduce visual effects for lower latency</div>
                                </div>
                                <button 
                                    onClick={() => onUpdate({ lowPerformanceMode: !prefs.lowPerformanceMode })}
                                    className={`w-10 h-6 rounded-full transition-colors relative ${prefs.lowPerformanceMode ? 'bg-cyan-600' : 'bg-slate-600'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${prefs.lowPerformanceMode ? 'left-5' : 'left-1'}`}></div>
                                </button>
                            </div>
                            
                            <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                                <div>
                                    <div className="text-sm font-bold text-white flex items-center gap-2"><Usb className="w-4 h-4" /> MIDI Input</div>
                                    <div className="text-xs text-slate-500">Enable physical MIDI device connection</div>
                                </div>
                                <button 
                                    onClick={() => onUpdate({ midiEnabled: !prefs.midiEnabled })}
                                    className={`w-10 h-6 rounded-full transition-colors relative ${prefs.midiEnabled ? 'bg-emerald-600' : 'bg-slate-600'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${prefs.midiEnabled ? 'left-5' : 'left-1'}`}></div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Data Persistence */}
                    {activeTab === 'DATA' && (
                        <div className="space-y-6">
                            <div className={`p-4 rounded-lg border ${prefs.cookiesAccepted ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-yellow-900/20 border-yellow-500/30'}`}>
                                <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                                    {prefs.cookiesAccepted ? <Check className="w-4 h-4 text-emerald-400" /> : <Activity className="w-4 h-4 text-yellow-400" />}
                                    Persistence Status: {prefs.cookiesAccepted ? 'Active' : 'Incognito'}
                                </h3>
                                <p className="text-xs text-slate-400">
                                    {prefs.cookiesAccepted 
                                        ? "Your projects, presets, and history are being saved locally." 
                                        : "Data will be lost when you close this tab."}
                                </p>
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-red-400 mb-2">Danger Zone</h3>
                                <button 
                                    onClick={handleClearData}
                                    className="w-full py-3 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-900/20 text-xs font-bold flex items-center justify-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" /> FACTORY RESET
                                </button>
                                <p className="text-[10px] text-slate-600 mt-2 text-center">Irreversible. Clears all IndexedDB and LocalStorage data.</p>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    </div>
  );
};