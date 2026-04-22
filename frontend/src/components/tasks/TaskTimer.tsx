import { useState, useEffect } from 'react';
import { Task } from '../../types/task';
import { Clock } from 'lucide-react';
import { clsx } from 'clsx';

interface Props {
  task: Task;
}

export const TaskTimer = ({ task }: Props) => {
  const { timerData } = task;
  const [displaySeconds, setDisplaySeconds] = useState(0);

  useEffect(() => {
    const calculateTime = () => {
      if (!timerData.isRunning || !timerData.startTime) {
        return timerData.elapsedTime;
      }
      const now = Date.now();
      const currentSessionSeconds = Math.floor((now - timerData.startTime) / 1000);
      return timerData.elapsedTime + currentSessionSeconds;
    };

    // Set initial display
    setDisplaySeconds(calculateTime());

    // Setup tick interval if running
    let interval: ReturnType<typeof setInterval>;
    if (timerData.isRunning) {
      interval = setInterval(() => {
        setDisplaySeconds(calculateTime());
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerData.isRunning, timerData.startTime, timerData.elapsedTime]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
      {/* Glow effect when running */}
      {timerData.isRunning && (
        <div className="absolute inset-0 bg-primary-500/10 animate-pulse pointer-events-none" />
      )}
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Time Tracking
          </h3>
          {timerData.isRunning ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-primary-400 bg-primary-500/10 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
              Running
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-800 px-2.5 py-1 rounded-full">
              Paused
            </span>
          )}
        </div>

        <div className="text-center mb-8">
          <div className={clsx(
            "text-5xl font-bold tracking-tight font-mono transition-colors",
            timerData.isRunning ? "text-white text-shadow-neon" : "text-gray-300"
          )}>
            {formatTime(displaySeconds)}
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Session History</h4>
          {timerData.logs.length === 0 && !timerData.isRunning && (
            <p className="text-sm text-gray-500 italic text-center">No time logged yet.</p>
          )}
          
          <div className="max-h-40 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            {timerData.logs.map((log, i) => (
              <div key={i} className="flex justify-between items-center text-sm p-2 rounded-lg bg-white/5 border border-white/5">
                <span className="text-gray-400">Session {i + 1}</span>
                <span className="text-gray-200 font-mono">{formatTime(log.duration)}</span>
              </div>
            ))}
            
            {timerData.isRunning && (
              <div className="flex justify-between items-center text-sm p-2 rounded-lg bg-primary-500/10 border border-primary-500/20">
                <span className="text-primary-300">Current Session</span>
                <span className="text-white font-mono">{formatTime(displaySeconds - timerData.elapsedTime)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
