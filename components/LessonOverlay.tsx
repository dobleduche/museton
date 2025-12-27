
import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, XCircle, Trophy, RefreshCcw, Music } from 'lucide-react';
import { Lesson } from '../types';

interface Props {
  lesson: Lesson;
  onClose: () => void;
  onComplete: (xp: number) => void;
  lastInputEvent: { note: string, timestamp: number } | null;
}

export const LessonOverlay: React.FC<Props> = ({ lesson, onClose, onComplete, lastInputEvent }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [status, setStatus] = useState<'WAITING' | 'SUCCESS' | 'ERROR'>('WAITING');
  const [progress, setProgress] = useState(0);

  const currentStep = lesson.steps[stepIndex];
  const isLastStep = stepIndex === lesson.steps.length - 1;

  useEffect(() => {
     if (!lastInputEvent) return;

     const lastPlayedNote = lastInputEvent.note;

     // Simple validation logic: Check if note matches target
     // Normalize note (remove octave if needed, though lesson targets usually have octave)
     // strictMatch checks against full string e.g. "C4"
     const strictMatch = currentStep.targetNotes.includes(lastPlayedNote);
     
     if (strictMatch) {
         handleSuccess();
     } else {
         // Optional: Shake effect or error feedback
         // setStatus('ERROR');
         // setTimeout(() => setStatus('WAITING'), 500);
     }
  }, [lastInputEvent]);

  const handleSuccess = () => {
      if (status === 'SUCCESS') return;
      setStatus('SUCCESS');
      
      const newProgress = ((stepIndex + 1) / lesson.steps.length) * 100;
      setProgress(newProgress);

      setTimeout(() => {
          if (isLastStep) {
              onComplete(lesson.xpReward);
          } else {
              setStepIndex(prev => prev + 1);
              setStatus('WAITING');
          }
      }, 1000);
  };

  return (
    <div className="absolute inset-x-0 bottom-0 top-auto md:top-0 md:bottom-auto z-40 p-4 pointer-events-none flex justify-center">
        <div className="bg-slate-900/95 backdrop-blur-xl border border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.2)] rounded-2xl p-6 w-full max-w-2xl pointer-events-auto transform md:translate-y-4 animate-in slide-in-from-top-4">
            
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
               <div>
                  <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mb-1">Guided Lesson • {lesson.difficulty}</div>
                  <h3 className="text-xl font-bold text-white">{lesson.title}</h3>
               </div>
               <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">Exit</button>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-slate-800 rounded-full mb-6 overflow-hidden">
                <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>

            {/* Instruction Area */}
            <div className="flex items-center gap-6">
                 <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${status === 'SUCCESS' ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 scale-110' : 'border-cyan-500 bg-cyan-900/30 text-cyan-400'}`}>
                     {status === 'SUCCESS' ? <CheckCircle2 className="w-8 h-8" /> : <Music className="w-8 h-8" />}
                 </div>
                 
                 <div className="flex-1">
                     <h4 className="text-lg font-bold text-white mb-1">
                         {status === 'SUCCESS' ? 'Great Job!' : `Step ${stepIndex + 1}: ${currentStep.instruction}`}
                     </h4>
                     <p className="text-sm text-slate-400">
                         {status === 'SUCCESS' ? 'Getting ready for next step...' : `Find and play: ${currentStep.targetNotes.join(', ')}`}
                     </p>
                 </div>

                 {status === 'SUCCESS' && isLastStep && (
                     <div className="animate-bounce">
                         <Trophy className="w-8 h-8 text-yellow-400" />
                     </div>
                 )}
            </div>
            
        </div>
    </div>
  );
};
