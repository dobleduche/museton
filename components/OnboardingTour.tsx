

import React, { useState } from 'react';
import { ArrowRight, Check, Sparkles, LayoutGrid, Zap, ChevronLeft } from 'lucide-react';

interface TourProps {
    onComplete: () => void;
}

export const OnboardingTour: React.FC<TourProps> = ({ onComplete }) => {
    const [step, setStep] = useState(0);

    const steps = [
        {
            title: "Welcome to MusetoN",
            desc: "The world's most advanced AI-powered music theory workstation. Let's get you set up.",
            icon: Sparkles, // Changed to Sparkles as generic welcome
            color: "text-cyan-400"
        },
        {
            title: "AI Command Center",
            desc: "Type anything in the search bar. 'F Minor Scale', 'Jazz Chord Progression', or 'Explain Tritone Substitution'. The system visualizes it instantly.",
            icon: Zap, // Swapped icon for relevance
            color: "text-purple-400"
        },
        {
            title: "Studio Workspaces",
            desc: "Use the sidebar to switch between Learning, Live Looping, the Sequencer, and finding Tutors. Everything you need in one place.",
            icon: LayoutGrid,
            color: "text-emerald-400"
        },
        {
            title: "The Oscillator Engine",
            desc: "This isn't just a picture. It's a real-time, low-latency synth. Click keys, use your computer keyboard, or connect a MIDI device to play.",
            icon: Zap, // Reused Zap or could use another
            color: "text-yellow-400"
        }
    ];

    // Ensure step is within bounds to prevent crashes
    const safeStep = Math.min(step, steps.length - 1);
    const current = steps[safeStep];
    const Icon = current.icon;

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div 
                className="bg-slate-900/90 border border-white/10 rounded-2xl p-8 w-full max-w-lg shadow-[0_0_100px_rgba(6,182,212,0.15)] relative overflow-hidden flex flex-col items-center text-center min-h-[450px]"
                onClick={(e) => e.stopPropagation()}
            >
                
                {/* Background Decor */}
                <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-${current.color.split('-')[1]}-500 to-transparent opacity-50`}></div>
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl"></div>

                {/* Cymatic Wave Effect for the first step */}
                {safeStep === 0 && <div className="cymatic-wave"></div>}

                {/* Icon */}
                <div className={`w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-xl ${current.color} transition-all duration-300 transform z-10`}>
                    <Icon className="w-10 h-10" />
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col items-center justify-start w-full z-10">
                    <h3 className="text-2xl font-bold text-white mb-3 transition-all duration-300">{current.title}</h3>
                    <p className="text-slate-400 text-lg leading-relaxed mb-8 transition-all duration-300">
                        {current.desc}
                    </p>
                </div>

                {/* Dots Indicator */}
                <div className="flex gap-2 mb-8">
                    {steps.map((_, i) => (
                        <div 
                            key={i} 
                            className={`h-1.5 rounded-full transition-all duration-300 ${i === safeStep ? 'w-8 bg-cyan-500' : 'w-2 bg-slate-700'}`}
                        />
                    ))}
                </div>

                {/* Controls */}
                <div className="flex w-full gap-3 mt-auto">
                    <button 
                        onClick={() => setStep(s => Math.max(0, s - 1))}
                        disabled={safeStep === 0}
                        className={`flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2
                            ${safeStep === 0 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:bg-white/5 hover:text-white'}
                        `}
                    >
                        <ChevronLeft className="w-4 h-4" /> Back
                    </button>

                    <button 
                        onClick={() => {
                            if (safeStep === steps.length - 1) {
                                onComplete();
                            } else {
                                // Clamp increment to ensure we never go out of bounds even with rapid clicking
                                setStep(s => Math.min(s + 1, steps.length - 1));
                            }
                        }}
                        className="flex-[2] bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-900/20"
                    >
                        {safeStep === steps.length - 1 ? 'Get Started' : 'Next'}
                        {safeStep === steps.length - 1 ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                    </button>
                </div>

                {/* Skip Button */}
                <button 
                    onClick={onComplete}
                    className="absolute top-4 right-4 text-xs font-bold text-slate-600 hover:text-slate-400 tracking-wider"
                >
                    SKIP
                </button>
            </div>
        </div>
    );
};