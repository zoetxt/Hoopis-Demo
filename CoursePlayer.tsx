/**
 * CoursePlayer.tsx
 * Netflix-style immersive course player for the Hoopis Performance Network.
 *
 * Dependencies:
 *   npm install react-youtube framer-motion
 *   Tailwind CSS dark theme must be configured in tailwind.config.js
 *
 * Usage:
 *   <CoursePlayer
 *     course={courseData}
 *     initialLessonId={1}
 *     onBack={() => navigate('/')}
 *     onComplete={(lessonId) => markComplete(lessonId)}
 *     accentColor="#00c8d4"
 *   />
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import YouTube, { YouTubePlayer, YouTubeEvent } from 'react-youtube';
import { motion, AnimatePresence } from 'framer-motion';

/* ─────────────────────── Types ─────────────────────── */
export interface Lesson {
  id: number;
  title: string;
  duration: string;   // e.g. "12:30"
  youtubeId: string;
  completed: boolean;
}

export interface Instructor {
  name: string;
  role: string;
  initials: string;
  avatar?: string;
}

export interface Course {
  id: string;
  title: string;
  instructor: Instructor;
  rating: number;
  enrolled: number;
  progress: number;   // 0–100
  description: string;
  tags: string[];
  lessons: Lesson[];
}

export interface CoursePlayerProps {
  course: Course;
  initialLessonId?: number;
  onBack?: () => void;
  onComplete?: (lessonId: number) => void;
  accentColor?: string;
}

/* ─────────────────────── Mock Data ─────────────────── */
export const mockCourse: Course = {
  id: 'hoopis-trust-101',
  title: 'The Trust Formula: Building Client Relationships That Last',
  instructor: {
    name: 'Colleen Stanley',
    role: 'President · SalesLeadership Inc.',
    initials: 'CS',
  },
  rating: 4.9,
  enrolled: 3241,
  progress: 43,
  description:
    'Emotional intelligence pioneer Colleen Stanley shows how top performers build the kind of trust that makes clients loyal for decades. Covers EQ frameworks, body language, and the neuroscience of rapport.',
  tags: ['All Levels', 'Relationships', 'EQ', '1h 12m'],
  lessons: [
    { id: 1, title: 'Why logic alone never closes a deal',         duration: '9:00',  youtubeId: 'dQw4w9WgXcQ', completed: true  },
    { id: 2, title: 'The EQ framework for sales professionals',    duration: '11:00', youtubeId: 'dQw4w9WgXcQ', completed: true  },
    { id: 3, title: 'Active listening — the lost skill',           duration: '10:00', youtubeId: 'dQw4w9WgXcQ', completed: false },
    { id: 4, title: 'Reading the room — body language signals',    duration: '12:00', youtubeId: 'dQw4w9WgXcQ', completed: false },
    { id: 5, title: 'Building trust through vulnerability',        duration: '9:00',  youtubeId: 'dQw4w9WgXcQ', completed: false },
    { id: 6, title: 'Maintaining trust through difficult periods', duration: '11:00', youtubeId: 'dQw4w9WgXcQ', completed: false },
    { id: 7, title: 'Turning clients into advocates',              duration: '10:00', youtubeId: 'dQw4w9WgXcQ', completed: false },
  ],
};

/* ─────────────────────── Helpers ───────────────────── */
function fmtTime(seconds: number): string {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/* ─────────────────────── Icons ─────────────────────── */
const PlayIcon   = () => <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const PauseIcon  = () => <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>;
const VolumeIcon = () => <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-white fill-none stroke-2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>;
const MuteIcon   = () => <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-white fill-none stroke-2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>;
const FullIcon   = () => <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-white fill-none stroke-2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>;
const CheckIcon  = () => <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-[#22c55e] fill-none stroke-2 stroke-round"><polyline points="20 6 9 17 4 12"/></svg>;
const BackIcon   = () => <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-white fill-none stroke-[2.5]"><polyline points="15 18 9 12 15 6"/></svg>;

/* ─────────────────────── Sub-components ────────────── */

/** Lesson item in the sidebar */
const LessonItem: React.FC<{
  lesson: Lesson;
  index: number;
  isActive: boolean;
  onClick: () => void;
  accent: string;
}> = ({ lesson, index, isActive, onClick, accent }) => (
  <motion.div
    initial={false}
    animate={{ borderLeftColor: isActive ? accent : 'transparent' }}
    transition={{ duration: 0.2 }}
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-l-[3px] transition-colors
      ${isActive ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}
  >
    {/* Number / Check */}
    <div
      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-colors
        ${lesson.completed ? 'border-[#22c55e] bg-[#22c55e]' : isActive ? 'border-[--accent] text-[--accent]' : 'border-white/20 text-white/40'}`}
      style={{ '--accent': accent } as React.CSSProperties}
    >
      {lesson.completed ? <CheckIcon /> : index + 1}
    </div>

    {/* Title + meta */}
    <div className="flex-1 min-w-0">
      <div className={`text-[12.5px] font-semibold leading-snug truncate transition-colors
        ${isActive ? 'text-white' : 'text-white/70'}`}>
        {lesson.title}
      </div>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-[10px] font-bold uppercase tracking-wide mt-0.5"
          style={{ color: accent }}
        >
          ▶ Now Playing
        </motion.div>
      )}
    </div>

    {/* Duration */}
    <div className="text-[11px] text-white/40 flex-shrink-0">{lesson.duration}</div>
  </motion.div>
);

/** Up-next countdown card */
const UpNextCard: React.FC<{
  lesson: Lesson;
  secondsLeft: number;
  onPlay: () => void;
  onDismiss: () => void;
  accent: string;
}> = ({ lesson, secondsLeft, onPlay, onDismiss, accent }) => (
  <motion.div
    initial={{ x: 280, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    exit={{ x: 280, opacity: 0 }}
    transition={{ type: 'spring', stiffness: 280, damping: 28 }}
    className="absolute bottom-20 right-4 w-[240px] bg-[#060d1f]/95 border border-white/10 rounded-xl overflow-hidden z-20 pointer-events-auto"
  >
    {/* Progress stripe */}
    <div className="h-[3px] bg-white/10">
      <motion.div
        className="h-full"
        style={{ backgroundColor: accent }}
        initial={{ width: '0%' }}
        animate={{ width: `${((15 - secondsLeft) / 15) * 100}%` }}
        transition={{ duration: 0.5, ease: 'linear' }}
      />
    </div>

    {/* Header */}
    <div className="flex justify-between items-center px-3 py-2">
      <span className="text-[11px] font-bold uppercase tracking-wide text-white/50">Up Next</span>
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold px-2 py-0.5 rounded text-black" style={{ backgroundColor: accent }}>
          {secondsLeft}s
        </span>
        <button onClick={onDismiss} className="text-white/40 hover:text-white text-sm leading-none">✕</button>
      </div>
    </div>

    {/* Thumb + body */}
    <div className="px-3 pb-3">
      <div className="text-[12px] font-semibold text-white leading-snug mb-1">{lesson.title}</div>
      <div className="text-[11px] text-white/40 mb-2">{lesson.duration}</div>
      <button
        onClick={onPlay}
        className="w-full py-1.5 rounded-lg text-[12px] font-bold text-black transition-opacity hover:opacity-85"
        style={{ backgroundColor: accent }}
      >
        Play Now →
      </button>
    </div>
  </motion.div>
);

/* ─────────────────────── Main Component ────────────── */
export const CoursePlayer: React.FC<CoursePlayerProps> = ({
  course,
  initialLessonId,
  onBack,
  onComplete,
  accentColor = '#00c8d4',
}) => {
  /* ── State ── */
  const [currentIdx, setCurrentIdx] = useState<number>(() => {
    if (initialLessonId) {
      const idx = course.lessons.findIndex(l => l.id === initialLessonId);
      return idx >= 0 ? idx : 0;
    }
    const firstUnfinished = course.lessons.findIndex(l => !l.completed);
    return firstUnfinished >= 0 ? firstUnfinished : 0;
  });
  const [lessons, setLessons] = useState<Lesson[]>(course.lessons);
  const [isPlaying, setIsPlaying]   = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]     = useState(0);
  const [volume, setVolume]         = useState(100);
  const [isMuted, setIsMuted]       = useState(false);
  const [progress, setProgress]     = useState(course.progress);
  const [descExpanded, setDescExpanded] = useState(false);
  const [upNextLesson, setUpNextLesson] = useState<Lesson | null>(null);
  const [upNextSeconds, setUpNextSeconds] = useState(15);
  const [speed, setSpeed]           = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  /* ── Refs ── */
  const ytRef         = useRef<YouTubePlayer>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const pollRef       = useRef<ReturnType<typeof setInterval>>();
  const hideTimerRef  = useRef<ReturnType<typeof setTimeout>>();
  const upNextTimerRef = useRef<ReturnType<typeof setInterval>>();

  const currentLesson = lessons[currentIdx];
  const nextLesson    = lessons[currentIdx + 1] ?? null;

  /* ── Polling ── */
  const startPoll = useCallback(() => {
    stopPoll();
    pollRef.current = setInterval(() => {
      const player = ytRef.current;
      if (!player) return;
      const cur = player.getCurrentTime();
      const dur = player.getDuration();
      if (!isDragging) { setCurrentTime(cur); setDuration(dur); }
      // Up next: 15s before end
      if (dur > 0 && dur - cur <= 15 && dur - cur > 0 && nextLesson && !upNextLesson) {
        setUpNextLesson(nextLesson);
        setUpNextSeconds(15);
      }
    }, 500);
  }, [isDragging, nextLesson, upNextLesson]);

  const stopPoll = () => { if (pollRef.current) clearInterval(pollRef.current); };

  /* ── Up-next countdown ── */
  useEffect(() => {
    if (!upNextLesson) return;
    let secs = 15;
    upNextTimerRef.current = setInterval(() => {
      secs--;
      setUpNextSeconds(secs);
      if (secs <= 0) { clearInterval(upNextTimerRef.current); goNextLesson(); }
    }, 1000);
    return () => clearInterval(upNextTimerRef.current);
  }, [upNextLesson]);

  /* ── Controls auto-hide ── */
  const showControls = useCallback(() => {
    setControlsVisible(true);
    clearTimeout(hideTimerRef.current);
    if (isPlaying) {
      hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
    }
  }, [isPlaying]);

  /* ── Fullscreen ── */
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      const player = ytRef.current;
      if (e.code === 'Space')       { e.preventDefault(); togglePlay(); }
      if (e.code === 'ArrowRight')  { player?.seekTo(player.getCurrentTime() + 10, true); }
      if (e.code === 'ArrowLeft')   { player?.seekTo(Math.max(0, player.getCurrentTime() - 10), true); }
      if (e.code === 'KeyM')        { toggleMute(); }
      if (e.code === 'KeyF')        { toggleFullscreen(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  /* ── Cleanup ── */
  useEffect(() => () => { stopPoll(); clearTimeout(hideTimerRef.current); clearInterval(upNextTimerRef.current); }, []);

  /* ── Actions ── */
  function togglePlay() {
    const player = ytRef.current;
    if (!player) return;
    if (isPlaying) player.pauseVideo(); else player.playVideo();
  }

  function toggleMute() {
    const player = ytRef.current;
    if (!player) return;
    if (isMuted) { player.unMute(); setIsMuted(false); } else { player.mute(); setIsMuted(true); }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  function goNextLesson() {
    setLessons(prev => prev.map((l, i) => i === currentIdx ? { ...l, completed: true } : l));
    onComplete?.(currentLesson.id);
    setCurrentIdx(prev => Math.min(prev + 1, lessons.length - 1));
    setUpNextLesson(null);
  }

  function loadLesson(idx: number) {
    setCurrentIdx(idx);
    setUpNextLesson(null);
    setCurrentTime(0);
    setDuration(0);
    clearInterval(upNextTimerRef.current);
    ytRef.current?.loadVideoById(lessons[idx].youtubeId);
    setIsPlaying(true);
  }

  /* Progress: percentage of course done */
  const doneCount = lessons.filter(l => l.completed).length;
  const courseProgress = Math.round((doneCount / lessons.length) * 100);

  /* ── YouTube handlers ── */
  const onReady = (e: YouTubeEvent) => {
    ytRef.current = e.target;
    setDuration(e.target.getDuration());
    e.target.setVolume(100);
  };

  const onStateChange = (e: YouTubeEvent) => {
    const YT = (window as any).YT;
    if (e.data === YT?.PlayerState?.PLAYING)  { setIsPlaying(true);  startPoll(); }
    if (e.data === YT?.PlayerState?.PAUSED)   { setIsPlaying(false); stopPoll(); }
    if (e.data === YT?.PlayerState?.ENDED)    { setIsPlaying(false); stopPoll(); goNextLesson(); }
  };

  const ytOpts = {
    height: '100%', width: '100%',
    playerVars: { controls: 0, modestbranding: 1, rel: 0, iv_load_policy: 3, disablekb: 1, playsinline: 1 },
  };

  /* ── Render ── */
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen bg-[#060d1f] text-white font-sans"
    >

      {/* ── TOP BAR ── */}
      <header className="fixed top-0 left-0 right-0 h-[60px] z-50 flex items-center justify-between px-5
        bg-gradient-to-b from-[#060d1f] to-[#060d1f]/70 backdrop-blur-md border-b border-white/[0.07]">
        <button
          onClick={() => {
            if (isPlaying && !window.confirm('Leave course? Your progress has been saved.')) return;
            onBack?.();
          }}
          className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity"
        >
          <BackIcon />
          <span className="text-sm font-semibold hidden sm:inline">Back to Hoopis</span>
        </button>

        <div className="absolute left-1/2 -translate-x-1/2 text-[13px] font-semibold opacity-90
          max-w-[320px] truncate hidden sm:block pointer-events-none">
          {course.title}
        </div>

        {/* Progress pill */}
        <div className="flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-full px-3 py-1.5">
          <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${courseProgress}%`, backgroundColor: accentColor }} />
          </div>
          <span className="text-[12px] font-bold" style={{ color: accentColor }}>{courseProgress}%</span>
        </div>
      </header>

      {/* ── MAIN GRID ── */}
      <div className="flex pt-[60px] min-h-screen">

        {/* Left column */}
        <div className="flex-1 min-w-0">

          {/* ── VIDEO PLAYER ── */}
          <div
            ref={containerRef}
            className="relative w-full bg-black"
            style={{ paddingBottom: '56.25%' }}
            onMouseMove={showControls}
            onMouseLeave={() => isPlaying && setControlsVisible(false)}
            onClick={() => { togglePlay(); showControls(); }}
          >
            {/* YouTube iframe */}
            <div className="absolute inset-0 pointer-events-none">
              <YouTube
                videoId={currentLesson.youtubeId}
                opts={ytOpts}
                onReady={onReady}
                onStateChange={onStateChange}
                className="w-full h-full"
                iframeClassName="w-full h-full"
              />
            </div>

            {/* Controls overlay */}
            <AnimatePresence>
              {controlsVisible && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 flex flex-col justify-end pointer-events-none"
                >
                  {/* Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#060d1f]/90 via-transparent to-transparent pointer-events-none" />

                  {/* Controls bar */}
                  <div className="relative z-10 px-4 pb-3 pointer-events-auto">
                    {/* Progress */}
                    <div className="group mb-2 cursor-pointer"
                      onMouseDown={(e) => {
                        setIsDragging(true);
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pct = (e.clientX - rect.left) / rect.width;
                        ytRef.current?.seekTo(pct * duration, true);
                      }}
                    >
                      <div className="h-1 group-hover:h-1.5 bg-white/20 rounded-full transition-all relative overflow-visible">
                        <div className="absolute left-0 top-0 h-full rounded-full bg-white/30 transition-all"
                          style={{ width: `${(currentTime / duration) * 100 || 0}%` }} />
                        <div className="absolute left-0 top-0 h-full rounded-full transition-all"
                          style={{ width: `${(currentTime / duration) * 100 || 0}%`, backgroundColor: accentColor }} />
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                          style={{ left: `${(currentTime / duration) * 100 || 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Buttons row */}
                    <div className="flex items-center gap-2">
                      {/* Play/Pause */}
                      <button onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                        className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-md transition-colors">
                        {isPlaying ? <PauseIcon /> : <PlayIcon />}
                      </button>

                      {/* Skip -10 */}
                      <button onClick={(e) => { e.stopPropagation(); ytRef.current?.seekTo(Math.max(0, currentTime - 10), true); }}
                        className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-md transition-colors text-white/80 text-xs font-bold">
                        ⏮10
                      </button>

                      {/* Skip +10 */}
                      <button onClick={(e) => { e.stopPropagation(); ytRef.current?.seekTo(currentTime + 10, true); }}
                        className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-md transition-colors text-white/80 text-xs font-bold">
                        10⏭
                      </button>

                      {/* Time */}
                      <span className="text-xs font-mono text-white/80 tabular-nums">
                        {fmtTime(currentTime)} / {fmtTime(duration)}
                      </span>

                      {/* Volume */}
                      <button onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                        className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-md transition-colors">
                        {isMuted ? <MuteIcon /> : <VolumeIcon />}
                      </button>
                      <input
                        type="range" min={0} max={100} value={isMuted ? 0 : volume}
                        onClick={e => e.stopPropagation()}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          setVolume(v);
                          ytRef.current?.setVolume(v);
                          if (v > 0) { ytRef.current?.unMute(); setIsMuted(false); }
                        }}
                        className="w-18 accent-[--accent] cursor-pointer hidden sm:block"
                        style={{ '--accent': accentColor } as React.CSSProperties}
                      />

                      {/* Lesson title */}
                      <span className="flex-1 text-[12px] text-white/60 truncate text-center hidden md:block px-2">
                        {currentLesson.title}
                      </span>

                      {/* Speed */}
                      <div className="relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(v => !v); }}
                          className="px-2 py-1 bg-white/10 hover:bg-white/20 border border-white/15 rounded text-[11px] font-bold transition-colors"
                        >
                          {speed}×
                        </button>
                        <AnimatePresence>
                          {showSpeedMenu && (
                            <motion.div
                              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                              className="absolute bottom-8 right-0 bg-[#1a2d4a] border border-white/10 rounded-lg overflow-hidden z-50 min-w-[80px]"
                            >
                              {[0.75, 1, 1.25, 1.5, 2].map(s => (
                                <button key={s}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSpeed(s);
                                    ytRef.current?.setPlaybackRate(s);
                                    setShowSpeedMenu(false);
                                  }}
                                  className={`block w-full text-left px-4 py-2 text-[13px] font-semibold hover:bg-white/10 transition-colors
                                    ${s === speed ? 'text-[--accent]' : 'text-white'}`}
                                  style={{ '--accent': accentColor } as React.CSSProperties}
                                >
                                  {s}×
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Fullscreen */}
                      <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                        className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-md transition-colors">
                        <FullIcon />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Up Next card */}
            <AnimatePresence>
              {upNextLesson && (
                <UpNextCard
                  lesson={upNextLesson}
                  secondsLeft={upNextSeconds}
                  onPlay={goNextLesson}
                  onDismiss={() => { setUpNextLesson(null); clearInterval(upNextTimerRef.current); }}
                  accent={accentColor}
                />
              )}
            </AnimatePresence>
          </div>

          {/* ── COURSE INFO ── */}
          <div className="px-6 py-5 border-b border-white/[0.07]">
            <h1 className="text-xl font-black mb-3 leading-snug">{course.title}</h1>

            {/* Instructor */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: `linear-gradient(135deg, #0e3060, ${accentColor})` }}
              >
                {course.instructor.initials}
              </div>
              <div>
                <div className="text-sm font-semibold">{course.instructor.name}</div>
                <div className="text-xs text-white/50">{course.instructor.role}</div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-5 mb-4 text-sm">
              <span className="flex items-center gap-1"><span className="text-[#f5c518]">★</span><span className="font-bold">{course.rating}</span></span>
              <span className="text-white/50">{course.enrolled.toLocaleString()} enrolled</span>
              <span className="text-white/50">{lessons.length} lessons</span>
            </div>

            {/* Progress */}
            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-white/50">Course Progress</span>
                <span className="font-bold" style={{ color: accentColor }}>{courseProgress}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: accentColor }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${courseProgress}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-white/60 leading-relaxed mb-1">
              {descExpanded ? course.description : course.description.slice(0, 140) + (course.description.length > 140 ? '…' : '')}
            </p>
            {course.description.length > 140 && (
              <button
                onClick={() => setDescExpanded(v => !v)}
                className="text-xs font-semibold mb-3 transition-colors"
                style={{ color: accentColor }}
              >
                {descExpanded ? 'Show less ↑' : 'Show more ↓'}
              </button>
            )}

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {course.tags.map(tag => (
                <span key={tag}
                  className="text-[11px] font-semibold px-3 py-1 rounded-full border"
                  style={{ color: accentColor, background: `${accentColor}18`, borderColor: `${accentColor}40` }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* ── RECOMMENDED RAIL (placeholder) ── */}
          <div className="px-6 py-5">
            <h2 className="text-sm font-bold mb-4 flex items-center gap-2">
              <span className="w-[3px] h-4 rounded-sm inline-block" style={{ backgroundColor: accentColor }} />
              You May Also Like
            </h2>
            <p className="text-sm text-white/30 italic">Related courses will appear here.</p>
          </div>
        </div>

        {/* ── SIDEBAR ── */}
        <aside className="w-[320px] flex-shrink-0 border-l border-white/[0.07] bg-[#0e1829]
          sticky top-[60px] h-[calc(100vh-60px)] flex flex-col hidden md:flex overflow-hidden">
          {/* Header */}
          <div className="px-4 py-4 border-b border-white/[0.07] flex-shrink-0">
            <div className="text-sm font-bold">Course Content</div>
            <div className="text-xs text-white/40 mt-0.5">{lessons.length} lessons · {course.tags.find(t => /\d/.test(t))}</div>
          </div>

          {/* Lesson list */}
          <div className="flex-1 overflow-y-auto">
            {lessons.map((lesson, idx) => (
              <LessonItem
                key={lesson.id}
                lesson={lesson}
                index={idx}
                isActive={idx === currentIdx}
                onClick={() => loadLesson(idx)}
                accent={accentColor}
              />
            ))}
          </div>
        </aside>

      </div>
    </motion.div>
  );
};

export default CoursePlayer;
