
import React from 'react';
import { Settings, Sliders, Speaker, Activity, Mic2, Radio, Volume2 } from 'lucide-react';
import { AudioEnvironment, EqPreset, SurroundMode, MixerState } from '../types';
import { audio } from '../services/audioEngine';

interface Props {
  state: MixerState;
  onUpdate: (updates: Partial<MixerState>) => void;
  onClose: () => void;
}

export const HolographicConsole: React.FC<Props> = ({ state, onUpdate, onClose }) => {
  const environments: AudioEnvironment[] = ['STUDIO', 'STADIUM', 'DUNGEON', 'HALLWAY', 'GARAGE', 'CLUB', 'CONCERT', 'ORCHESTRA'];
  const eqs: EqPreset[] = ['FLAT', 'SUPER-BASS', 'MELLOW', 'POP', 'TREBLE', 'REGGAE'];

  const handleEnvChange = (env: AudioEnvironment) => {
    onUpdate({ environment: env });
    audio.setEnvironment(env);
  };

  const handleEqChange = (eq: EqPreset) => {
    onUpdate({ eq });
    audio.setEQ(eq);
  };

  return (
    <div className="fixed top-20 right-4 w-72 bg-slate-900/80 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.2)] z-40 overflow-hidden animate-in fade-in slide-in-from-right-10">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-900/40 to-slate-900 p-4 border-b border-cyan-500/20 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
          <h3 className="text-cyan-400 font-bold text-sm tracking-widest uppercase text-shadow">Holo-Mixer</h3>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
      </div>

      <div className="p-5 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
        
        {/* Environment Section */}
        <div>
          <h4 className="text-[10px] text-slate-500 uppercase font-bold mb-3 flex items-center gap-2">
            <Speaker className="w-3 h-3" /> Spatial Environment
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {environments.map(env => (
              <button
                key={env}
                onClick={() => handleEnvChange(env)}
                className={`text-[10px] py-2 px-1 rounded border transition-all font-bold ${
                  state.environment === env 
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {env}
              </button>
            ))}
          </div>
        </div>

        {/* EQ Section */}
        <div>
          <h4 className="text-[10px] text-slate-500 uppercase font-bold mb-3 flex items-center gap-2">
             <Sliders className="w-3 h-3" /> Frequency Response
          </h4>
          <div className="flex flex-wrap gap-2">
            {eqs.map(eq => (
              <button
                key={eq}
                onClick={() => handleEqChange(eq)}
                className={`text-[10px] py-1 px-3 rounded-full border transition-all ${
                  state.eq === eq 
                    ? 'bg-pink-500/20 border-pink-500 text-pink-300' 
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                {eq}
              </button>
            ))}
          </div>
        </div>

        {/* Surround Simulation */}
        <div>
          <h4 className="text-[10px] text-slate-500 uppercase font-bold mb-3 flex items-center gap-2">
             <Radio className="w-3 h-3" /> Surround Processor
          </h4>
          <div className="bg-slate-800/50 rounded-lg p-1 flex">
             {(['STEREO', 'DOLBY_SIM', 'WIDE_3D'] as SurroundMode[]).map(mode => (
               <button
                 key={mode}
                 onClick={() => onUpdate({ surround: mode })}
                 className={`flex-1 text-[9px] py-2 rounded transition-all font-bold ${
                    state.surround === mode 
                      ? 'bg-emerald-500/20 text-emerald-400 shadow-inner' 
                      : 'text-slate-500 hover:text-slate-300'
                 }`}
               >
                 {mode.replace('_', ' ')}
               </button>
             ))}
          </div>
        </div>

        {/* Volume Control */}
        <div>
          <h4 className="text-[10px] text-slate-500 uppercase font-bold mb-3 flex items-center gap-2">
             <Volume2 className="w-3 h-3" /> Master Output
          </h4>
          <div className="flex items-center gap-3">
             <input 
               type="range" 
               min="0" max="1" step="0.01" 
               value={state.volume}
               onChange={(e) => {
                 const vol = parseFloat(e.target.value);
                 onUpdate({ volume: vol });
                 audio.setMasterVolume(vol);
               }}
               className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
             />
             <span className="text-[10px] font-mono text-cyan-400 w-8 text-right">
               {Math.round(state.volume * 100)}%
             </span>
          </div>
        </div>
        
        {/* Output Meter (Fake Visual) */}
        <div className="space-y-1">
           <div className="flex justify-between text-[9px] text-slate-500 font-mono">
              <span>L</span>
              <span>-dB</span>
              <span>R</span>
           </div>
           <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
              <div className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 w-[70%] animate-pulse opacity-80"></div>
           </div>
           <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
              <div className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 w-[65%] animate-pulse opacity-80" style={{animationDelay: '0.1s'}}></div>
           </div>
        </div>

      </div>
    </div>
  );
};
