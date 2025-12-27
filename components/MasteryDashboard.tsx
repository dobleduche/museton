
import React from 'react';
import { Target, Zap, TrendingUp, AlertCircle, PlayCircle } from 'lucide-react';
import { PracticeSession, HotSpot } from '../types';

interface DashboardProps {
  session: PracticeSession | null;
  onStartDrill: (spot: HotSpot) => void;
}

export const MasteryDashboard: React.FC<DashboardProps> = ({ session, onStartDrill }) => {
  if (!session) return <div className="text-center text-slate-500 py-10">Complete a challenge to view Mastery metrics.</div>;

  const { metrics, hotSpots } = session;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* Main Score Gauge */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 to-purple-900/20"></div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 z-10">Mastery Score</h3>
          <div className="relative w-32 h-32 flex items-center justify-center z-10">
            <svg className="w-full h-full rotate-[-90deg]" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="8" />
              <circle 
                cx="50" cy="50" r="45" fill="none" stroke="#22d3ee" strokeWidth="8"
                strokeDasharray="283"
                strokeDashoffset={283 - (283 * metrics.overallScore) / 100}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
               <span className="text-4xl font-bold text-white text-shadow-glow">{metrics.overallScore}</span>
            </div>
          </div>
          <div className="mt-4 text-center z-10">
             <div className="text-xs text-cyan-300 font-mono">{session.feedbackSummary}</div>
          </div>
        </div>

        {/* Metrics Radar (Simplified as bars) */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-center">
           <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Technical Breakdown</h3>
           <div className="space-y-4">
              {[
                { label: 'Accuracy', val: metrics.accuracy, color: 'bg-emerald-500' },
                { label: 'Timing', val: metrics.timing, color: 'bg-yellow-500' },
                { label: 'Dynamics', val: metrics.dynamics, color: 'bg-purple-500' },
                { label: 'Expression', val: metrics.expression, color: 'bg-pink-500' },
              ].map(m => (
                <div key={m.label}>
                   <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">{m.label}</span>
                      <span className="font-mono text-white">{m.val}%</span>
                   </div>
                   <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${m.color} shadow-[0_0_10px_currentColor]`} style={{ width: `${m.val}%` }}></div>
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* Dynamic Review / Hot Spots */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col relative overflow-hidden border-red-500/20">
           <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/10 blur-3xl rounded-full"></div>
           <h3 className="text-sm font-bold text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Dynamic Review
           </h3>
           <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {hotSpots.length === 0 && <div className="text-slate-500 text-xs italic">No critical errors detected. Perfect run!</div>}
              {hotSpots.map(spot => (
                 <div key={spot.id} className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 hover:bg-red-500/20 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-xs font-bold text-red-200">{spot.measure}</span>
                       <span className="text-[10px] bg-red-900/50 px-1.5 py-0.5 rounded text-red-300 border border-red-500/30">{spot.issue}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mb-2">Issue with: {spot.notes.join(', ')}</p>
                    <button 
                      onClick={() => onStartDrill(spot)}
                      className="w-full py-1.5 bg-red-500 hover:bg-red-400 text-white text-xs font-bold rounded flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                    >
                       <Zap className="w-3 h-3" /> START DRILL ({Math.round(spot.drillSpeed * 100)}%)
                    </button>
                 </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};
