/**
 * CourseSearchBar.tsx
 * Smart autocomplete search bar for the Hoopis Performance Network.
 *
 * Dependencies:
 *   npm install framer-motion
 *   Requires Tailwind CSS dark theme
 *
 * Usage:
 *   <CourseSearchBar
 *     courses={mockCourses}
 *     onSelect={(course) => navigate(`/player/${course.id}`)}
 *     placeholder="Search courses..."
 *     className="w-full max-w-xl"
 *   />
 */

'use client';

import React, {
  useState, useRef, useEffect, useCallback, useMemo,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/* ─────────────────────────── Types ─────────────────────────── */
export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  category: string;
  level: string;
  duration: string;
  slug: string;
}

export interface CourseSearchBarProps {
  courses: Course[];
  onSelect: (course: Course) => void;
  placeholder?: string;
  className?: string;
}

/* ─────────────────────────── Mock Data ─────────────────────── */
export const mockCourses: Course[] = [
  {
    id: '1',
    title: 'Life Insurance Fundamentals',
    description: 'Master core life insurance concepts from term to whole life policies.',
    thumbnail: 'https://images.unsplash.com/photo-1573497491208-6b1acb260507?w=96&h=96&q=80&fit=crop',
    category: 'Life Insurance',
    level: 'Beginner',
    duration: '3h 20m',
    slug: '/courses/life-insurance-fundamentals',
  },
  {
    id: '2',
    title: 'Advanced Annuity Strategies',
    description: 'Deep dive into annuity products and sales techniques for experienced agents.',
    thumbnail: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=96&h=96&q=80&fit=crop',
    category: 'Annuities',
    level: 'Advanced',
    duration: '4h 10m',
    slug: '/courses/advanced-annuities',
  },
  {
    id: '3',
    title: 'Compliance & Ethics in Insurance',
    description: 'Stay current with regulatory requirements and ethical sales standards.',
    thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=96&h=96&q=80&fit=crop',
    category: 'Compliance',
    level: 'All Levels',
    duration: '1h 45m',
    slug: '/courses/compliance-ethics',
  },
  {
    id: '4',
    title: 'Prospecting in the Digital Age',
    description: 'Blend traditional outreach with LinkedIn and email to build a consistent pipeline.',
    thumbnail: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=96&h=96&q=80&fit=crop',
    category: 'Prospecting',
    level: 'Intermediate',
    duration: '58m',
    slug: '/courses/prospecting-digital-age',
  },
  {
    id: '5',
    title: 'Mastering High-Stakes Client Conversations',
    description: 'Psychological frameworks top advisors use to turn difficult conversations into closed deals.',
    thumbnail: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=96&h=96&q=80&fit=crop',
    category: 'Sales',
    level: 'Advanced',
    duration: '1h 24m',
    slug: '/courses/high-stakes-conversations',
  },
  {
    id: '6',
    title: 'The Trust Formula',
    description: 'Build the kind of trust that makes clients loyal for decades using EQ frameworks.',
    thumbnail: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=96&h=96&q=80&fit=crop',
    category: 'Relationships',
    level: 'All Levels',
    duration: '1h 12m',
    slug: '/courses/trust-formula',
  },
  {
    id: '7',
    title: 'Time Blocking for Peak Producers',
    description: 'Habit-based scheduling systems that separate the top 1% of producers from everyone else.',
    thumbnail: 'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=96&h=96&q=80&fit=crop',
    category: 'Productivity',
    level: 'All Levels',
    duration: '52m',
    slug: '/courses/time-blocking',
  },
  {
    id: '8',
    title: 'Referral Mastery: The Systematic Approach',
    description: 'A repeatable, low-pressure system for generating warm referrals from your client base.',
    thumbnail: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=96&h=96&q=80&fit=crop',
    category: 'Referrals',
    level: 'All Levels',
    duration: '44m',
    slug: '/courses/referral-mastery',
  },
];

/* ─────────────────────────── Helpers ───────────────────────── */
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ─────────────────────────── Icons ─────────────────────────── */
const SearchIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    className={className}
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

/* ─────────────────────────── Suggestion Item ───────────────── */
const SuggestionItem: React.FC<{
  course: Course;
  isActive: boolean;
  onSelect: () => void;
  onHover: () => void;
}> = ({ course, isActive, onSelect, onHover }) => (
  <motion.div
    initial={false}
    onMouseEnter={onHover}
    onMouseDown={(e) => { e.preventDefault(); onSelect(); }}
    className={`flex items-center gap-3 px-4 py-3 cursor-pointer min-h-[72px] transition-colors
      ${isActive ? 'bg-[#00c8d4]/[0.08]' : 'hover:bg-white/[0.04]'}`}
  >
    {/* Thumbnail */}
    <img
      src={course.thumbnail}
      alt={course.title}
      className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-white/10"
      loading="lazy"
    />

    {/* Body */}
    <div className="flex-1 min-w-0">
      <div className="text-[13px] font-bold text-white truncate leading-snug mb-0.5">
        {course.title}
      </div>
      <div className="text-[11.5px] text-[#8a9ec0] leading-snug line-clamp-2 mb-1.5">
        {course.description}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded border
          bg-[#00c8d4]/10 text-[#00c8d4] border-[#00c8d4]/25">
          {course.category}
        </span>
        <span className="text-[10px] text-[#8a9ec0]">{course.level}</span>
        <span className="text-[10px] text-[#8a9ec0]">·</span>
        <span className="text-[10px] text-[#8a9ec0]">{course.duration}</span>
      </div>
    </div>
  </motion.div>
);

/* ─────────────────────────── Main Component ────────────────── */
export const CourseSearchBar: React.FC<CourseSearchBarProps> = ({
  courses,
  onSelect,
  placeholder = 'Search courses...',
  className = '',
}) => {
  const [query, setQuery]         = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef  = useRef<HTMLInputElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  /* Popular = first 4 courses */
  const popular = useMemo(() => courses.slice(0, 4), [courses]);

  /* Filtered results */
  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const q = debouncedQuery.toLowerCase();
    return courses.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.level.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [debouncedQuery, courses]);

  const displayItems  = debouncedQuery.trim() ? results : popular;
  const sectionLabel  = debouncedQuery.trim()
    ? results.length
      ? `${results.length} result${results.length !== 1 ? 's' : ''} for "${debouncedQuery}"`
      : ''
    : 'Popular Courses';
  const showDropdown  = isFocused;
  const showNoResults = debouncedQuery.trim() && results.length === 0;

  /* Close on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* Reset active index when results change */
  useEffect(() => setActiveIdx(-1), [debouncedQuery]);

  /* Keyboard navigation */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const total = displayItems.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, total - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0 && displayItems[activeIdx]) {
        onSelect(displayItems[activeIdx]);
        setIsFocused(false);
        setQuery('');
      } else if (results.length > 0) {
        onSelect(results[0]);
        setIsFocused(false);
        setQuery('');
      }
    } else if (e.key === 'Escape') {
      setIsFocused(false);
      inputRef.current?.blur();
    }
  }, [activeIdx, displayItems, results, onSelect]);

  return (
    <div ref={wrapRef} className={`relative ${className}`}>

      {/* ── Input ── */}
      <div className="relative">
        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a9ec0] pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className={`w-full h-11 pl-10 pr-4 rounded-full text-sm text-white
            bg-white/[0.07] border border-white/[0.12]
            placeholder:text-[#8a9ec0] outline-none
            transition-all duration-200
            focus:border-[#00c8d4] focus:bg-[#00c8d4]/[0.05]
            focus:shadow-[0_0_0_3px_rgba(0,200,212,0.12)]`}
        />
      </div>

      {/* ── Dropdown ── */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute top-[calc(100%+8px)] left-0 right-0 z-50
              bg-[#0e1829] border border-[#1a2d4a] rounded-2xl
              shadow-[0_24px_64px_rgba(0,0,0,0.55)]
              max-h-[420px] overflow-y-auto
              scrollbar-thin scrollbar-thumb-[#1a2d4a]"
          >
            {showNoResults ? (
              /* No results */
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <span className="text-3xl mb-2 opacity-40">🔍</span>
                <p className="text-sm text-[#8a9ec0]">
                  No courses found for{' '}
                  <strong className="text-white">"{debouncedQuery}"</strong>
                </p>
              </div>
            ) : (
              <>
                {/* Section header */}
                {sectionLabel && (
                  <div className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#8a9ec0]">
                    {sectionLabel}
                  </div>
                )}

                {/* Items */}
                <div className="pb-2">
                  {displayItems.map((course, idx) => (
                    <SuggestionItem
                      key={course.id}
                      course={course}
                      isActive={idx === activeIdx}
                      onHover={() => setActiveIdx(idx)}
                      onSelect={() => {
                        onSelect(course);
                        setIsFocused(false);
                        setQuery('');
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CourseSearchBar;
