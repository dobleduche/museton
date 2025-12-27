
import React, { useState, useEffect, useRef } from 'react';
import { Mic, Search, Activity, Globe, Music, BarChart3, Radio, Check, X } from 'lucide-react';
import { AudioAnalysis } from '../types';
import { analyzeAudioEnvironment } from '../services/geminiService';
import { audio } from '../services/audioEngine';

export const AudioIdentifier = () => {
  const [isListening, setIsListening] = useState(false);
  const [analysis, setAnalysis] = useState<AudioAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animationId: number;
    if (isListening && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if(!ctx) return;
        
        // Use real analyser from engine if available
        const analyser = audio.analyser;

        const draw = () => {
            const w = canvasRef.current!.width;
            const h = canvasRef.current!.height;
            ctx.clearRect(0,0,w,h);
            
            if (analyser) {
               const bufferLength = analyser.frequencyBinCount;
               const dataArray = new Uint8Array(bufferLength);
               analyser.getByteTimeDomainData(dataArray);
               
               // Circular Visualizer like Shazam
               const cx = w/2;
               const cy = h/2;
               const radius = 60;
               
               ctx.beginPath();
               ctx.lineWidth = 4;
               ctx.strokeStyle = '#22d3ee'; // Cyan
               
               for(let i = 0; i < bufferLength; i+= 10) {
                 const v = (dataArray[i] / 128.0) - 1; // -1 to 1
                 const r = radius + (v * 40); // Modulate radius
                 const angle = (i / bufferLength) * Math.PI * 2;
                 const x = cx + Math.cos(angle) * r;
                 const y = cy + Math.sin(angle) * r;
                 
                 if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
               }
               ctx.closePath();
               ctx.stroke();

               // Inner Core
               ctx.beginPath();
               ctx.arc(cx, cy, radius - 10, 0, Math.PI*2);
               ctx.fillStyle = '#0891b2';
               ctx.fill();

            } 
            animationId = requestAnimationFrame(draw);
        };
        draw();
    } else {
        cancelAnimationFrame(animationId!);
    }
    return () => cancelAnimationFrame(animationId!);
  }, [isListening]);

  const handleToggleListen = async () => {
    if (isListening) return;

    setIsListening(true);
    setAnalysis(null);
    setTimeLeft(8); // Increased for better accuracy

    try {
        // 1. Start External Microphone Analysis
        await audio.startMicrophoneAnalysis();
        
        // 2. Countdown Timer
        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        // 3. Stop after 8 seconds
        setTimeout(async () => {
            clearInterval(interval);
            setIsListening(false);
            setLoading(true);
            
            // 4. Get Data from Mic Recorder
            const blob = await audio.stopMicrophoneAnalysis();
            const base64 = await audio.blobToBase64(blob);
            
            // 5. Analyze with Gemini
            const result = await analyzeAudioEnvironment(base64);
            setAnalysis(result);
            setLoading(false);
        }, 8000);

    } catch (e) {
        console.error("Recording failed", e);
        alert("Please enable microphone access to identifying songs.");
        setIsListening(false);
        setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
       
       {!analysis && !loading && (
           <div className="flex flex-col items-center justify-center min-h-[400px]">
               <div className="relative group cursor-pointer" onClick={handleToggleListen}>
                   {/* Main Button */}
                   <div className="w-48 h-48 rounded-full bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center shadow-[0_0_60px_rgba(6,182,212,0.4)] hover:scale-105 transition-transform z-10 relative">
                        <div className="flex flex-col items-center">
                            <span className="text-5xl font-bold text-white mb-2">S</span>
                            <span className="text-xs text-cyan-100 font-bold tracking-widest">TAP TO ID</span>
                        </div>
                   </div>
                   {/* Ambient Rings */}
                   <div className="absolute inset-0 rounded-full border border-cyan-500/20 scale-125"></div>
                   <div className="absolute inset-0 rounded-full border border-cyan-500/10 scale-150"></div>
               </div>
           </div>
       )}

       {/* Listening State */}
       {isListening && (
           <div className="flex flex-col items-center justify-center min-h-[400px]">
                <div className="relative w-64 h-64 flex items-center justify-center">
                    <canvas ref={canvasRef} width={300} height={300} className="absolute inset-0 z-20" />
                    {/* Ripple Effects */}
                    <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping"></div>
                    <div className="absolute inset-0 rounded-full bg-cyan-500/10 animate-[ping_2s_infinite_0.5s]"></div>
                </div>
                <h3 className="text-2xl font-bold text-white mt-8 animate-pulse">Listening...</h3>
                <p className="text-slate-400 text-sm mt-2">Scanning audio fingerprint ({timeLeft}s)</p>
           </div>
       )}

       {/* Loading State */}
       {loading && (
           <div className="flex flex-col items-center justify-center min-h-[400px]">
               <Activity className="w-16 h-16 text-cyan-400 animate-spin mb-6" />
               <h3 className="text-xl font-bold text-white">Matching in Database...</h3>
               <p className="text-slate-500 text-sm">Analyzing timbre, melody, and lyrics</p>
           </div>
       )}

       {/* Results Dashboard */}
       {analysis && (
           <div className="max-w-md mx-auto animate-in zoom-in duration-500">
               
               {/* MATCH CARD */}
               {analysis.matchFound && analysis.identifiedSong ? (
                   <div className="glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative">
                       {/* Background Blur */}
                       <div className="absolute inset-0 bg-gradient-to-br from-cyan-900 via-blue-900 to-black opacity-90 z-0"></div>
                       <div className="absolute top-0 right-0 p-4 z-10">
                           <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white flex items-center gap-1">
                               <Check className="w-3 h-3 text-emerald-400" /> MATCH FOUND
                           </div>
                       </div>
                       
                       <div className="relative z-10 p-8 flex flex-col items-center text-center">
                           <div className="w-48 h-48 bg-black rounded-lg shadow-2xl mb-6 overflow-hidden relative group">
                               {/* Mock Cover Art Generator */}
                               <div 
                                    className="w-full h-full flex items-center justify-center text-6xl font-bold text-white/20"
                                    style={{ background: `linear-gradient(135deg, ${analysis.identifiedSong.coverColor || '#333'}, #000)` }}
                               >
                                   {analysis.identifiedSong.title.charAt(0)}
                               </div>
                               <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                   <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center"><Music /></div>
                               </div>
                           </div>
                           
                           <h2 className="text-3xl font-black text-white mb-2 leading-tight">{analysis.identifiedSong.title}</h2>
                           <p className="text-xl text-cyan-400 font-medium mb-1">{analysis.identifiedSong.artist}</p>
                           <p className="text-sm text-slate-400 mb-6">{analysis.identifiedSong.album} • {analysis.identifiedSong.releaseYear}</p>

                           <div className="flex gap-3 w-full">
                               <button className="flex-1 py-3 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition-colors">
                                   Play on Spotify
                               </button>
                               <button onClick={() => setAnalysis(null)} className="px-4 py-3 bg-white/10 rounded-xl hover:bg-white/20">
                                   <X className="w-5 h-5 text-white" />
                               </button>
                           </div>
                       </div>
                   </div>
               ) : (
                   /* NO MATCH / ANALYSIS ONLY */
                   <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-purple-500">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-lg font-bold text-white">No exact song match</h3>
                            <span className="text-xs bg-purple-900/50 text-purple-300 px-2 py-1 rounded">ANALYSIS MODE</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-y-6 mb-6">
                            <div>
                                <div className="text-xs text-slate-500 font-bold mb-1">DETECTED GENRE</div>
                                <div className="text-2xl font-bold text-white">{analysis.detectedGenre}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 font-bold mb-1">LIKELY KEY</div>
                                <div className="text-2xl font-bold text-cyan-400">{analysis.likelyKey}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 font-bold mb-1">TEMPO</div>
                                <div className="text-2xl font-bold text-purple-400">{analysis.bpm} BPM</div>
                            </div>
                        </div>

                        <div className="space-y-2">
                             <div className="text-xs text-slate-500 font-bold">SIMILAR ARTISTS</div>
                             <div className="flex flex-wrap gap-2">
                                {analysis.similarArtists.map((artist, i) => (
                                    <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-sm text-slate-300">
                                        {artist}
                                    </span>
                                ))}
                             </div>
                        </div>
                        
                        <button onClick={() => setAnalysis(null)} className="mt-6 w-full py-3 bg-slate-800 rounded-lg text-slate-400 font-bold hover:bg-slate-700">
                            Try Again
                        </button>
                   </div>
               )}
           </div>
       )}
    </div>
  );
};
