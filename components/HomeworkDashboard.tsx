
import React, { useState } from 'react';
import { BookOpen, CheckCircle, Clock, ExternalLink, PlayCircle, Music2, Share2, Grid } from 'lucide-react';
import { Assignment } from '../types';

interface Props {
  assignments: Assignment[];
  onStartLesson: (lessonId: string) => void;
  onUpdateStatus: (id: string, status: Assignment['status']) => void;
}

export const HomeworkDashboard: React.FC<Props> = ({ assignments, onStartLesson, onUpdateStatus }) => {
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Completed'>('All');

  const filtered = assignments.filter(a => {
    if (filter === 'All') return true;
    if (filter === 'Pending') return a.status !== 'Completed';
    return a.status === 'Completed';
  });

  const getProviderIcon = (provider: Assignment['provider']) => {
    switch(provider) {
      case 'Spotify': return <div className="w-6 h-6 rounded-full bg-[#1DB954] flex items-center justify-center"><Music2 className="w-4 h-4 text-black" /></div>;
      case 'SoundCloud': return <div className="w-6 h-6 rounded-full bg-[#ff5500] flex items-center justify-center"><Music2 className="w-4 h-4 text-white" /></div>;
      case 'Flat.io': return <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center"><Grid className="w-4 h-4 text-white" /></div>;
      case 'GoogleClassroom': return <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center"><BookOpen className="w-4 h-4 text-white" /></div>;
      default: return <div className="w-6 h-6 rounded-full bg-cyan-600 flex items-center justify-center"><PlayCircle className="w-4 h-4 text-white" /></div>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
             <BookOpen className="w-6 h-6 text-cyan-400" /> Student Assignments
          </h2>
          <p className="text-slate-400 text-sm">Track your progress and complete external tasks.</p>
        </div>
        
        <div className="flex bg-slate-900 rounded-lg p-1 border border-white/10">
           {['All', 'Pending', 'Completed'].map(f => (
             <button
               key={f}
               onClick={() => setFilter(f as any)}
               className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${filter === f ? 'bg-cyan-900/50 text-cyan-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
             >
               {f}
             </button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {filtered.length === 0 && (
           <div className="col-span-full p-12 text-center border border-dashed border-white/10 rounded-xl text-slate-500">
              No assignments found for this filter.
           </div>
         )}

         {filtered.map(item => (
           <div key={item.id} className="glass-panel p-5 rounded-2xl flex flex-col group hover:border-cyan-500/30 transition-all">
              <div className="flex justify-between items-start mb-4">
                 <div className="flex items-center gap-3">
                    {getProviderIcon(item.provider)}
                    <div>
                       <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{item.provider}</span>
                       <h3 className="font-bold text-white leading-tight">{item.title}</h3>
                    </div>
                 </div>
                 <div className={`text-[10px] px-2 py-0.5 rounded border ${item.status === 'Completed' ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500/20' : 'bg-yellow-900/20 text-yellow-400 border-yellow-500/20'}`}>
                    {item.status}
                 </div>
              </div>

              {item.thumbnail && (
                 <div className="h-32 mb-4 rounded-lg bg-slate-800 overflow-hidden relative">
                    <img src={item.thumbnail} alt="preview" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                    {item.provider === 'Spotify' && <div className="absolute inset-0 flex items-center justify-center"><div className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm"><PlayCircle className="w-6 h-6 text-white" /></div></div>}
                 </div>
              )}

              <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                 <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="w-3 h-3" /> Due {item.dueDate.toLocaleDateString()}
                 </div>
                 
                 <div className="flex gap-2">
                    {item.status !== 'Completed' && (
                        <button 
                            onClick={() => onUpdateStatus(item.id, 'Completed')} 
                            className="p-2 hover:bg-emerald-900/20 text-slate-500 hover:text-emerald-400 rounded-lg transition-colors"
                            title="Mark as Complete"
                        >
                            <CheckCircle className="w-4 h-4" />
                        </button>
                    )}
                    
                    {item.provider === 'Internal' && item.lessonId ? (
                        <button 
                          onClick={() => onStartLesson(item.lessonId!)}
                          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs rounded-lg transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                        >
                          Start Lesson
                        </button>
                    ) : (
                        <a 
                          href={item.link} 
                          target="_blank" 
                          rel="noreferrer"
                          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-2"
                        >
                           Open <ExternalLink className="w-3 h-3" />
                        </a>
                    )}
                 </div>
              </div>
           </div>
         ))}
      </div>

      {/* Integration Footer */}
      <div className="mt-12 pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
         <div className="flex gap-4">
             <span className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"><Share2 className="w-3 h-3" /> Connect Google Classroom</span>
             <span className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"><Share2 className="w-3 h-3" /> Connect Teams</span>
         </div>
         <div>Protected by FERPA & COPPA Compliance Standards</div>
      </div>
    </div>
  );
};
