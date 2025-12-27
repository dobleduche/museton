
import React, { useState, useEffect } from 'react';
import { Clock, Cpu, Wifi } from 'lucide-react';

export const Footer = () => {
  const [time, setTime] = useState(new Date());
  const [showAnalog, setShowAnalog] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    }).format(date);
  };

  const secondsDegrees = (time.getSeconds() / 60) * 360;
  const minutesDegrees = (time.getMinutes() / 60) * 360 + (time.getSeconds()/60)*6;
  const hoursDegrees = ((time.getHours() % 12) / 12) * 360 + (time.getMinutes()/60)*30;

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[#020408]/90 backdrop-blur-xl border-t border-white/5 h-10 flex items-center justify-between px-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      
      {/* Floating Name Tag - Standalone & Centered */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-4 group cursor-default">
         <div className="bg-[#050508] border border-cyan-500/30 px-6 py-1 rounded-t-lg rounded-b-sm shadow-[0_0_20px_rgba(6,182,212,0.15)] flex items-center gap-2 transform transition-transform group-hover:-translate-y-1">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></div>
            <span className="text-[10px] font-black tracking-[0.3em] text-cyan-400 uppercase text-shadow-glow">MusetoN Core</span>
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></div>
         </div>
         {/* Connector visual to footer */}
         <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
      </div>

      {/* Left Data: System Stats */}
      <div className="flex items-center gap-6 text-[9px] font-mono text-slate-500">
         <div className="flex items-center gap-2 group cursor-help transition-colors hover:text-emerald-400">
            <Wifi className="w-3 h-3 text-emerald-500" />
            <span>CONNECTED // 12ms</span>
         </div>
         <div className="hidden md:flex items-center gap-2 hover:text-purple-400 transition-colors cursor-help">
            <Cpu className="w-3 h-3 text-purple-500" />
            <span>DSP ENGINE: ONLINE</span>
         </div>
      </div>

      {/* Right: Timezone Clock */}
      <div className="flex items-center gap-4">
         <button 
           onClick={() => setShowAnalog(!showAnalog)}
           className="flex items-center gap-3 text-[10px] font-bold text-slate-400 hover:text-white transition-all bg-white/5 hover:bg-white/10 px-3 py-1 rounded-full border border-white/5 hover:border-cyan-500/30"
           title="Toggle Analog/Digital"
         >
            <Clock className="w-3 h-3 text-cyan-500" />
            
            {showAnalog ? (
               <div className="relative w-4 h-4 rounded-full border border-slate-400 bg-slate-800">
                  <div className="absolute top-1/2 left-1/2 w-1.5 h-[1px] bg-white origin-left -translate-y-[0.5px] rounded-full" style={{ transform: `rotate(${hoursDegrees - 90}deg)` }}></div>
                  <div className="absolute top-1/2 left-1/2 w-1.5 h-[1px] bg-slate-300 origin-left -translate-y-[0.5px] rounded-full" style={{ transform: `rotate(${minutesDegrees - 90}deg)` }}></div>
                  <div className="absolute top-1/2 left-1/2 w-1.5 h-[1px] bg-red-500 origin-left -translate-y-[0.5px]" style={{ transform: `rotate(${secondsDegrees - 90}deg)` }}></div>
               </div>
            ) : (
               <span className="tracking-widest font-mono text-cyan-100 uppercase">{formatTime(time)}</span>
            )}
         </button>
      </div>
    </footer>
  );
};
