'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  chips?: string[];
}

interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface HoopisChatSearchProps {
  /** Endpoint for your API proxy route. Defaults to /api/chat */
  apiEndpoint?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = {
  navy: '#060d1f',
  teal: '#00c8d4',
  white: '#ffffff',
  muted: '#8a9ec0',
  border: '#1a2d4a',
  surface: '#0d1a30',
};

const COURSE_CATALOG = `
Available courses on Hoopis Performance Network:

1. Mastering High-Stakes Client Conversations
   Instructor: Brian Ahearn | Level: Advanced | Topics: Sales, Negotiation | Duration: 1h 24m | 7 chapters

2. Prospecting in the Digital Age
   Instructor: Jeb Blount | Level: Intermediate | Topics: Sales, Prospecting | Duration: 58m | 6 chapters

3. The Trust Formula: Building Client Relationships That Last
   Instructor: Colleen Stanley | Level: All Levels | Topics: Relationships, EQ | Duration: 1h 12m | 7 chapters

4. Closing Techniques for Complex Sales
   Instructor: Anthony Iannarino | Level: Advanced | Topics: Closing, B2B | Duration: 1h 8m | 6 chapters

5. Referral Mastery: The Systematic Approach
   Instructor: Michael Goldberg | Level: All Levels | Topics: Referrals, Networking | Duration: 44m | 5 chapters

6. Time Blocking for Peak Producers
   Instructor: Darren Hardy | Level: All Levels | Topics: Productivity, Habits | Duration: 52m | 5 chapters

7. Underwriting Relationships: Working With Carriers
   Instructor: Elizabeth Scheithe | Level: Advanced | Topics: Insurance, Underwriting | Duration: 1h 4m | 6 chapters

8. Long-Term Care Planning Conversations
   Instructor: Harley Gordon | Level: Advanced | Topics: Insurance, LTC | Duration: 48m | 5 chapters
`;

const SYSTEM_PROMPT = `You are HPN Advisor, an AI learning coach for Hoopis Performance Network (HPN) — a premium learning platform for financial professionals, insurance agents, and wealth advisors.

Your job is to guide users to the right course through a short, warm conversation. Ask 3–4 focused questions, then recommend 1–2 courses that best fit their needs.

Conversation flow:
1. Ask about their role (financial advisor, insurance agent, agency owner, etc.)
2. Ask about their biggest challenge or goal right now
3. Ask about their experience level or specific topic of interest
4. (Optional) Ask one more clarifying question if needed
5. Recommend 1–2 courses with a clear reason why

Rules:
- Keep every response to 1–3 sentences maximum. Be concise and friendly.
- Ask only ONE question per message.
- Never list multiple questions at once.
- After 3–4 exchanges, make your recommendation even if you don't have perfect information.
- For recommendations, include the instructor name and a one-sentence reason it fits them.
- End every recommendation with a CTA on its own line: "Want to start? [Course Title →]"
- After recommending, ask if they'd like to explore another topic.

${COURSE_CATALOG}

IMPORTANT: At the very end of each message, on its own line, append quick-reply chip suggestions in this exact format:
CHIPS:["Option 1","Option 2","Option 3"]

Include 2–4 chips that are short and natural. The CHIPS line will be parsed out and shown as buttons — do NOT include it in your conversational text.`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseChips(raw: string): { text: string; chips: string[] } {
  const match = raw.match(/CHIPS:\[([^\]]*)\]\s*$/m);
  if (!match) return { text: raw.trim(), chips: [] };

  const text = raw.replace(/CHIPS:\[([^\]]*)\]\s*$/m, '').trim();
  try {
    const chips = JSON.parse(`[${match[1]}]`);
    return { text, chips: Array.isArray(chips) ? chips.filter(Boolean) : [] };
  } catch {
    return { text, chips: [] };
  }
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div
      className="inline-flex items-center gap-1 px-4 py-3 rounded-2xl"
      style={{ backgroundColor: COLORS.border, borderBottomLeftRadius: 4 }}
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block w-2 h-2 rounded-full"
          style={{ backgroundColor: COLORS.muted }}
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.55, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

function BotAvatar() {
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
      style={{ backgroundColor: COLORS.teal, color: COLORS.navy }}
    >
      AI
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  onChipClick: (chip: string) => void;
  disabled: boolean;
}

function MessageBubble({ message, onChipClick, disabled }: MessageBubbleProps) {
  const isBot = message.role === 'assistant';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={`flex gap-2 ${isBot ? 'justify-start' : 'justify-end'}`}
    >
      {isBot && <BotAvatar />}
      <div className={`flex flex-col gap-2 ${isBot ? 'items-start' : 'items-end'} max-w-[82%]`}>
        <div
          className="px-3 py-2.5 text-sm leading-relaxed"
          style={{
            backgroundColor: isBot ? COLORS.border : COLORS.teal,
            color: isBot ? COLORS.white : COLORS.navy,
            borderRadius: isBot ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
          }}
        >
          {/* Render course CTA links in bold teal */}
          {message.content.split(/(\[.+?→\])/).map((part, i) =>
            /^\[.+?→\]$/.test(part) ? (
              <span key={i} style={{ color: isBot ? COLORS.teal : COLORS.navy, fontWeight: 600 }}>
                {part}
              </span>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </div>

        {/* Quick-reply chips */}
        {isBot && message.chips && message.chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.chips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => onChipClick(chip)}
                disabled={disabled}
                className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                style={{
                  border: `1px solid ${COLORS.teal}`,
                  color: COLORS.teal,
                  backgroundColor: 'transparent',
                  opacity: disabled ? 0.4 : 1,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!disabled) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = COLORS.teal;
                    (e.currentTarget as HTMLButtonElement).style.color = COLORS.navy;
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = COLORS.teal;
                }}
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HoopisChatSearch({ apiEndpoint = '/api/chat' }: HoopisChatSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [history, setHistory] = useState<ConversationTurn[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => chatInputRef.current?.focus(), 350);
    }
  }, [isOpen]);

  // Initial greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting: Message = {
        id: uid(),
        role: 'assistant',
        content: "Hi! I'm your HPN learning advisor. I'd love to help you find the right course. What's your role in the financial services industry?",
        chips: ['Financial Advisor', 'Insurance Agent', 'Agency Owner', 'Just getting started'],
      };
      setMessages([greeting]);
    }
  }, [isOpen, messages.length]);

  const pushBotMessage = (text: string, chips: string[] = []) => {
    setMessages((prev) => [...prev, { id: uid(), role: 'assistant', content: text, chips }]);
  };

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  const handleReset = () => {
    setMessages([]);
    setHistory([]);
    setInput('');
  };

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isTyping) return;

      const userMsg: Message = { id: uid(), role: 'user', content: text };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setIsTyping(true);

      const nextHistory: ConversationTurn[] = [...history, { role: 'user', content: text }];
      setHistory(nextHistory);

      try {
        const res = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: nextHistory,
            system: SYSTEM_PROMPT,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const raw: string = data.content ?? data.message ?? '';
        const { text: botText, chips } = parseChips(raw);

        setHistory((h) => [...h, { role: 'assistant', content: raw }]);
        setIsTyping(false);
        pushBotMessage(botText, chips);
      } catch (err) {
        console.error('Chat error:', err);
        setIsTyping(false);
        pushBotMessage("Sorry, I'm having trouble connecting right now. Please try again in a moment.", [
          'Try again',
        ]);
      }
    },
    [history, isTyping, apiEndpoint]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) sendMessage(input.trim());
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed z-50 flex flex-col items-end"
      style={{ bottom: 24, right: 24 }}
    >
      {/* ── Chat Panel ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="mb-3 flex flex-col rounded-2xl overflow-hidden shadow-2xl"
            style={{
              width: 'min(380px, calc(100vw - 48px))',
              height: 520,
              backgroundColor: COLORS.navy,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 flex-shrink-0"
              style={{ borderBottom: `1px solid ${COLORS.border}` }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: COLORS.teal, color: COLORS.navy }}
                >
                  AI
                </div>
                <div>
                  <p className="text-white text-sm font-semibold leading-tight">HPN Advisor</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="block w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span className="text-xs" style={{ color: COLORS.muted }}>
                      Course recommendations
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Reset */}
                <button
                  onClick={handleReset}
                  title="Start over"
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
                  style={{ color: COLORS.muted }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                </button>
                {/* Close */}
                <button
                  onClick={handleClose}
                  title="Close"
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
                  style={{ color: COLORS.muted }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
              style={{ scrollbarWidth: 'thin', scrollbarColor: `${COLORS.border} transparent` }}
            >
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    onChipClick={sendMessage}
                    disabled={isTyping}
                  />
                ))}
              </AnimatePresence>

              {/* Typing indicator */}
              <AnimatePresence>
                {isTyping && (
                  <motion.div
                    key="typing"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-start gap-2"
                  >
                    <BotAvatar />
                    <TypingDots />
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="px-4 py-3 flex items-center gap-2 flex-shrink-0"
              style={{ borderTop: `1px solid ${COLORS.border}` }}
            >
              <input
                ref={chatInputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message…"
                disabled={isTyping}
                className="flex-1 px-3 py-2 text-sm rounded-xl outline-none transition-all"
                style={{
                  backgroundColor: COLORS.border,
                  color: COLORS.white,
                  border: `1px solid ${COLORS.border}`,
                  caretColor: COLORS.teal,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = COLORS.teal;
                  e.currentTarget.style.boxShadow = `0 0 0 2px rgba(0,200,212,0.15)`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = COLORS.border;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  backgroundColor: COLORS.teal,
                  color: COLORS.navy,
                  opacity: !input.trim() || isTyping ? 0.4 : 1,
                  cursor: !input.trim() || isTyping ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (input.trim() && !isTyping) {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)';
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Search Bar Trigger ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="searchbar"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={handleOpen}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl group transition-all"
            style={{
              width: 'min(340px, calc(100vw - 48px))',
              backgroundColor: COLORS.navy,
              border: `1px solid ${COLORS.border}`,
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.borderColor = COLORS.teal;
              el.style.boxShadow = `0 0 0 2px rgba(0,200,212,0.15), 0 24px 48px rgba(0,0,0,0.5)`;
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.borderColor = COLORS.border;
              el.style.boxShadow = '0 24px 48px rgba(0,0,0,0.5)';
            }}
          >
            {/* Search icon */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="flex-shrink-0"
              style={{ stroke: COLORS.muted }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>

            {/* Placeholder text */}
            <span className="text-sm flex-1 text-left" style={{ color: COLORS.muted }}>
              What would you like to learn today?
            </span>

            {/* AI badge */}
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded-full flex-shrink-0"
              style={{ backgroundColor: `${COLORS.teal}22`, border: `1px solid ${COLORS.teal}44` }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill={COLORS.teal}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="text-xs font-semibold" style={{ color: COLORS.teal }}>
                AI
              </span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
