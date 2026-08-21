"use client";

import React, { useState, useEffect } from "react";
import { Button, Badge } from "@unicom/ui";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";

export interface VideoLearningPlayerProps {
  materialId?: string;
  assignmentId?: string;
  title: string;
  durationSeconds?: number;
  onCompleted?: () => void;
}

export const VideoLearningPlayer: React.FC<VideoLearningPlayerProps> = ({
  title,
  durationSeconds = 300,
  onCompleted,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [watchedSeconds, setWatchedSeconds] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [showSeekAlert, setShowSeekAlert] = useState<boolean>(false);

  // Playback simulation ticker
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying && currentTime < durationSeconds) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          const next = Math.min(durationSeconds, prev + 1 * playbackSpeed);
          setWatchedSeconds((w) => {
            const nextWatched = Math.min(durationSeconds, w + 1 * playbackSpeed);
            const ratio = nextWatched / durationSeconds;
            if (ratio >= 0.98 && !isCompleted) {
              setIsCompleted(true);
              if (onCompleted) onCompleted();
            }
            return nextWatched;
          });
          return next;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentTime, durationSeconds, playbackSpeed, isCompleted, onCompleted]);

  const coveragePercent = Math.min(100, Math.round((watchedSeconds / durationSeconds) * 100));

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleSeekAttempt = () => {
    setShowSeekAlert(true);
    setTimeout(() => setShowSeekAlert(false), 3000);
  };

  return (
    <div className="bg-slate-900 text-white rounded-[10px] overflow-hidden border border-slate-800 shadow-xl">
      {/* Video Viewport Simulated Screen */}
      <div className="relative aspect-video bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-16 h-16 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center mb-3">
          {isPlaying ? (
            <div className="w-6 h-6 flex gap-1.5 justify-center items-center">
              <div className="w-2 h-6 bg-blue-500 rounded-sm animate-pulse" />
              <div className="w-2 h-6 bg-blue-500 rounded-sm animate-pulse delay-75" />
            </div>
          ) : (
            <Play className="w-7 h-7 text-blue-400 fill-blue-400 ml-1" />
          )}
        </div>

        <h4 className="text-base font-bold text-slate-100 max-w-md">{title}</h4>
        <p className="text-xs text-slate-400 mt-1">
          Simulated Interactive Video Player with Server-Authoritative Anti-Skip Tracking
        </p>

        {showSeekAlert && (
          <div className="absolute top-4 bg-amber-500/90 text-slate-950 font-semibold text-xs px-3 py-1.5 rounded-[4px] flex items-center gap-1.5 animate-bounce">
            <ShieldAlert className="w-4 h-4" />
            <span>Fitur percepat (seek) dinonaktifkan untuk memvalidasi kelulusan materi.</span>
          </div>
        )}

        {isCompleted && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2" />
            <h4 className="text-lg font-bold text-white">Materi Video Selesai!</h4>
            <p className="text-xs text-slate-300 max-w-sm mt-1">
              Cakupan menonton unik telah mencapai ambang batas resmi 98%. Progres Anda telah disimpan di server.
            </p>
          </div>
        )}
      </div>

      {/* Progress & Anti-Skip Metric Header */}
      <div className="bg-slate-850 px-4 py-2.5 border-t border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Unique Watched Coverage:</span>
          <span className="font-bold text-blue-400">{coveragePercent}% / 98%</span>
          {isCompleted ? (
            <Badge variant="success" size="sm">Valid (100%)</Badge>
          ) : (
            <Badge variant="warning" size="sm">Belum Memenuhi</Badge>
          )}
        </div>

        <div className="text-slate-400 text-xs">
          {formatTime(currentTime)} / {formatTime(durationSeconds)}
        </div>
      </div>

      {/* Timeline Bar (Seek Locked) */}
      <div
        className="w-full bg-slate-800 h-2 relative cursor-not-allowed"
        onClick={handleSeekAttempt}
        title="Anti-Skip Engine: Fast-forward dinonaktifkan"
      >
        <div
          className="bg-blue-600 h-full transition-all duration-200"
          style={{ width: `${(currentTime / durationSeconds) * 100}%` }}
        />
      </div>

      {/* Control Bar */}
      <div className="bg-slate-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant={isPlaying ? "secondary" : "primary"}
            onClick={() => setIsPlaying(!isPlaying)}
            leftIcon={isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          >
            {isPlaying ? "Jeda" : "Putar Video"}
          </Button>

          <button
            onClick={() => setCurrentTime(0)}
            className="text-slate-400 hover:text-white text-xs flex items-center gap-1 p-1.5 rounded hover:bg-slate-800"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Ulangi</span>
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {/* Speed Selector (Max 2x per PRD §37) */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Kecepatan:</span>
            {[1.0, 1.25, 1.5, 2.0].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                  playbackSpeed === spd
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="text-slate-400 hover:text-white p-1 rounded"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
