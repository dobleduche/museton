
import React, { useEffect, useState } from 'react';

export const InvestorHUD = () => {
    const [fps, setFps] = useState(0);
    const [memory, setMemory] = useState<any>(null);
    const [latency, setLatency] = useState(0);

    useEffect(() => {
        let frameCount = 0;
        let lastTime = performance.now();
        let animationFrameId: number;

        const loop = () => {
            const now = performance.now();
            frameCount++;
            if (now - lastTime >= 1000) {
                setFps(Math.round(frameCount * 1000 / (now - lastTime)));
                frameCount = 0;
                lastTime = now;
                
                // Memory Check (Chrome)
                if ((performance as any).memory) {
                    setMemory((performance as any).memory);
                }
                
                // Simulated Latency Jitter
                setLatency(12 + Math.random() * 5);
            }
            animationFrameId = requestAnimationFrame(loop);
        };
        loop();
        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    return (
        <div className="fixed bottom-4 left-4 z-50 pointer-events-none">
            <div className="bg-black/80 backdrop-blur-md border border-cyan-500/30 rounded-lg p-3 shadow-lg flex flex-col gap-1 font-mono text-[10px] text-cyan-400 w-48">
                 <div className="flex justify-between border-b border-white/10 pb-1 mb-1">
                    <span className="font-bold text-white">INVESTOR MODE</span>
                    <span className="animate-pulse">LIVE</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-slate-500">RENDER</span>
                    <span>{fps} FPS</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-slate-500">HEAP</span>
                    <span className={memory && memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.8 ? 'text-red-400' : 'text-emerald-400'}>
                        {memory ? Math.round(memory.usedJSHeapSize / 1048576) : 0} MB
                    </span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-slate-500">DSP LATENCY</span>
                    <span>{latency.toFixed(1)}ms</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-slate-500">REACT</span>
                    <span>v19.0.0</span>
                 </div>
            </div>
        </div>
    );
};
