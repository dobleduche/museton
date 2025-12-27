
import React, { useState } from 'react';
import { MapPin, Star, ShieldCheck, Filter, ExternalLink, User } from 'lucide-react';
import { Tutor } from '../types';

interface Props {
  tutors: Tutor[];
  onChat: (tutor: Tutor) => void;
}

export const TutorDirectory: React.FC<Props> = ({ tutors, onChat }) => {
  const [filterInst, setFilterInst] = useState("All");
  const [filterPrice, setFilterPrice] = useState("All");

  const filtered = tutors.filter(t => {
      if (filterInst !== "All" && !t.specialty.some(s => s.includes(filterInst))) return false;
      if (filterPrice !== "All" && t.rate !== filterPrice) return false;
      return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in">
        {/* Header & Map Viz Placeholder */}
        <div className="h-64 rounded-2xl bg-slate-900 border border-white/10 relative overflow-hidden group">
            {/* Simulated Map Background */}
            <div className="absolute inset-0 bg-[#0f172a] opacity-80">
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            </div>
            
            <div className="absolute bottom-6 left-6 z-10">
                <h2 className="text-3xl font-bold text-white mb-2">Global Tutor Network</h2>
                <div className="flex items-center gap-2 text-cyan-400 text-sm font-bold bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-cyan-500/30 w-fit">
                    <MapPin className="w-4 h-4" />
                    <span>Using Location: New York, NY (Simulated)</span>
                </div>
            </div>

            {/* Simulated Holographic Pins */}
            <div className="absolute top-1/2 left-1/2 -translate-x-12 -translate-y-8 w-8 h-8 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center animate-bounce shadow-[0_0_20px_cyan]">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <div className="absolute -top-8 bg-slate-900 text-xs px-2 py-1 rounded border border-cyan-500/30 text-white whitespace-nowrap">Maestro Vance</div>
            </div>
             <div className="absolute top-1/3 left-1/3 w-8 h-8 rounded-full bg-purple-500/20 border-2 border-purple-400 flex items-center justify-center animate-bounce delay-75 shadow-[0_0_20px_purple]">
                <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            <div className="absolute bottom-1/3 right-1/4 w-8 h-8 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center animate-bounce delay-150 shadow-[0_0_20px_emerald]">
                <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center bg-white/5 p-4 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase tracking-wider">
                <Filter className="w-4 h-4" /> Filters:
            </div>
            
            <select 
                value={filterInst}
                onChange={(e) => setFilterInst(e.target.value)}
                className="bg-slate-800 text-white text-sm px-4 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500"
            >
                <option value="All">All Instruments</option>
                <option value="Piano">Piano</option>
                <option value="Jazz">Jazz</option>
                <option value="Trap">Trap/Production</option>
                <option value="Theory">Theory</option>
            </select>

            <select 
                value={filterPrice}
                onChange={(e) => setFilterPrice(e.target.value)}
                className="bg-slate-800 text-white text-sm px-4 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500"
            >
                <option value="All">All Rates</option>
                <option value="$">$ (Budget)</option>
                <option value="$$">$$ (Standard)</option>
                <option value="$$$">$$$ (Premium)</option>
            </select>

            <div className="ml-auto text-xs text-slate-500">
                Found {filtered.length} verified tutors
            </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(tutor => (
                <div key={tutor.id} className="glass-panel p-6 rounded-2xl group hover:border-cyan-500/50 transition-all relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-xl font-bold text-white border border-white/10 shadow-lg">
                            {tutor.name.charAt(0)}
                        </div>
                        {tutor.isVerified && (
                            <div className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded border border-emerald-500/20 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" /> VERIFIED
                            </div>
                        )}
                    </div>

                    <h3 className="text-xl font-bold text-white mb-1">{tutor.name}</h3>
                    <p className="text-sm text-cyan-400 mb-4 font-mono">{tutor.specialty.join(', ')}</p>

                    <div className="flex items-center gap-4 text-xs text-slate-400 mb-6 bg-black/20 p-2 rounded-lg">
                        <span className="flex items-center gap-1 text-yellow-400"><Star className="w-3 h-3 fill-current" /> {tutor.rating}</span>
                        <span>•</span>
                        <span className="text-slate-300">{tutor.rate} / hr</span>
                        <span>•</span>
                        <span>{tutor.location}</span>
                    </div>

                    <div className="flex gap-2">
                        <button 
                            onClick={() => onChat(tutor)}
                            className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-black font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                        >
                            <User className="w-4 h-4" /> Chat
                        </button>
                        <button className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/5">
                            <ExternalLink className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};
