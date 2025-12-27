
import React from 'react';
import { Cookie, Shield, Check, X } from 'lucide-react';

interface Props {
  onAccept: () => void;
  onReject: () => void;
}

export const CookieBanner: React.FC<Props> = ({ onAccept, onReject }) => {
  return (
    <div className="fixed bottom-0 inset-x-0 z-[100] p-4 bg-slate-900/95 backdrop-blur-xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-20 duration-500">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        
        <div className="flex items-start gap-4">
           <div className="w-10 h-10 rounded-full bg-cyan-900/30 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-cyan-400" />
           </div>
           <div>
              <h3 className="text-white font-bold text-sm mb-1">System Memory & Persistence</h3>
              <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                 MusetoN uses strictly local storage to persist your Synth Presets, Beat Projects, and Audio Preferences. 
                 We do not track you across the web. Enabling this allows you to save your work between sessions.
              </p>
           </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
           <button 
             onClick={onReject}
             className="flex-1 md:flex-none px-6 py-2 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 text-xs font-bold transition-all"
           >
             Reject (Incognito)
           </button>
           <button 
             onClick={onAccept}
             className="flex-1 md:flex-none px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
           >
             <Check className="w-3 h-3" /> Enable Persistence
           </button>
        </div>

      </div>
    </div>
  );
};
