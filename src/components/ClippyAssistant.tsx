"use client";
import React, { useEffect, useRef, useState } from 'react';

// Simple SVG Clippy (can be replaced with a better image or animation)
const clippySVG = (
  <svg width="60" height="80" viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="30" cy="60" rx="25" ry="15" fill="#C0C0C0" />
    <ellipse cx="30" cy="40" rx="20" ry="30" fill="#E0E0E0" />
    <ellipse cx="22" cy="35" rx="3" ry="5" fill="#333" />
    <ellipse cx="38" cy="35" rx="3" ry="5" fill="#333" />
    <ellipse cx="22" cy="37" rx="1" ry="2" fill="#fff" />
    <ellipse cx="38" cy="37" rx="1" ry="2" fill="#fff" />
    <ellipse cx="30" cy="55" rx="7" ry="3" fill="#999" />
    <ellipse cx="30" cy="55" rx="3" ry="1.5" fill="#fff" />
  </svg>
);

const JOKES = [
  'Why did the function cross the road? To get to the other scope!',
  'What do you call 8 hobbits? A hobbyte.'
];

function getRandomJoke(context: string) {
  // Optionally, use context to pick a joke
  return JOKES[Math.floor(Math.random() * JOKES.length)];
}

const STORAGE_KEY = 'clippy-assistant-state-v1';

interface ClippyState {
  x: number;
  y: number;
  open: boolean;
}

const defaultState: ClippyState = {
  x: 40,
  y: 200,
  open: false,
};

const ClippyAssistant: React.FC = () => {
  const [state, setState] = useState<ClippyState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...defaultState, ...JSON.parse(saved) };
    }
    return defaultState;
  });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [joke, setJoke] = useState<string | null>(null);
  const lastActiveRef = useRef(Date.now());
  const clippyRef = useRef<HTMLDivElement>(null);

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Inactivity joke timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (!state.open && Date.now() - lastActiveRef.current > 60000) {
        setJoke(getRandomJoke(document.title));
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [state.open]);

  // Reset joke and timer on any interaction
  const resetInactivity = () => {
    lastActiveRef.current = Date.now();
    setJoke(null);
  };

  // Drag logic
  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setOffset({
      x: e.clientX - state.x,
      y: e.clientY - state.y,
    });
    resetInactivity();
  };
  useEffect(() => {
    if (!dragging) return;
    const onMouseMove = (e: MouseEvent) => {
      setState((s) => ({ ...s, x: e.clientX - offset.x, y: e.clientY - offset.y }));
    };
    const onMouseUp = () => setDragging(false);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragging, offset]);

  // Chat logic (simple demo)
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ from: 'user' | 'clippy'; text: string }[]>([]);
  const sendMessage = () => {
    if (!chatInput.trim()) return;
    setChatHistory((h) => [...h, { from: 'user', text: chatInput }]);
    setTimeout(() => {
      setChatHistory((h) => [...h, { from: 'clippy', text: `Sabi mo: "${chatInput}". Need help?` }]);
    }, 600);
    setChatInput('');
    resetInactivity();
  };

  // Persist position on navigation (popstate)
  useEffect(() => {
    const handler = () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [state]);

  return (
    <div>
      <div
        ref={clippyRef}
        style={{
          position: 'fixed',
          left: state.x,
          top: state.y,
          zIndex: 9999,
          cursor: dragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          transition: dragging ? 'none' : 'box-shadow 0.2s',
          boxShadow: state.open ? '0 4px 24px #0002' : '0 2px 8px #0001',
        }}
        onMouseDown={onMouseDown}
        onClick={() => {
          if (!dragging) setState((s) => ({ ...s, open: !s.open }));
          resetInactivity();
        }}
      >
        {clippySVG}
        {joke && !state.open && (
          <div className="absolute left-1/2 -translate-x-1/2 mt-2 bg-white dark:bg-dark-primary border border-light-200 dark:border-dark-200 rounded shadow-lg p-2 text-xs max-w-xs min-w-[180px] text-black dark:text-white" style={{ top: '80px', pointerEvents: 'none' }}>{joke}</div>
        )}
      </div>
      {state.open && (
        <div
          className="fixed z-[10000]"
          style={{ left: state.x + 70, top: state.y, minWidth: 260, maxWidth: 340 }}
          onClick={resetInactivity}
        >
          <div className="bg-white dark:bg-dark-primary border border-light-200 dark:border-dark-200 rounded-lg shadow-xl p-4 flex flex-col space-y-2">
            <div className="font-bold text-[#24A0ED] mb-1">Hi, ako si Clippy!</div>
            <div className="overflow-y-auto max-h-40 text-xs mb-2">
              {chatHistory.length === 0 && <div className="text-gray-400">Anong maitutulong ko?</div>}
              {chatHistory.map((msg, i) => (
                <div key={i} className={msg.from === 'user' ? 'text-right text-blue-700' : 'text-left text-black dark:text-white'}>
                  <span className="inline-block px-2 py-1 rounded bg-gray-100 dark:bg-dark-secondary m-1">{msg.text}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-row gap-2">
              <input
                className="flex-1 border rounded px-2 py-1 text-xs bg-light-100 dark:bg-dark-100 text-black dark:text-white"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
              />
              <button
                className="bg-[#24A0ED] text-white px-3 py-1 rounded text-xs font-bold"
                onClick={sendMessage}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClippyAssistant;
