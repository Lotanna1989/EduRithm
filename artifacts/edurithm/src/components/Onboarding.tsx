import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

const STORAGE_KEY = 'edurithm_onboarded';
const LEVEL_KEY   = 'edurithm_level';
const TRACK_KEY   = 'edurithm_track';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

const LEVELS = [
  { id: 'beginner',     label: 'Beginner',     desc: 'Little or no coding experience' },
  { id: 'intermediate', label: 'Intermediate',  desc: 'Know some basics, want to go deeper' },
  { id: 'advanced',     label: 'Advanced',      desc: 'Comfortable with fundamentals' },
];

const TRACKS = [
  { id: 'html',       label: 'HTML',       emoji: '🌐', desc: 'Structure web pages' },
  { id: 'css',        label: 'CSS',        emoji: '🎨', desc: 'Style and design' },
  { id: 'javascript', label: 'JavaScript', emoji: '⚡', desc: 'Make things interactive' },
  { id: 'python',     label: 'Python',     emoji: '🐍', desc: 'Data, logic & automation' },
];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [visible, setVisible]   = useState(false);
  const [fading, setFading]     = useState(false);
  const [step, setStep]         = useState(1); // 1 = level, 2 = track, 3 = welcome
  const [level, setLevel]       = useState('');
  const [track, setTrack]       = useState('');
  const [message, setMessage]   = useState('');
  const [concepts, setConcepts] = useState<string[]>([]);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  async function chooseTrack(t: string) {
    setTrack(t);
    setStep(3);
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/ai/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, track: t }),
      });
      const data = await res.json();
      setMessage(data.message ?? 'Welcome to EduRithm!');
      setConcepts(data.recommendedConcepts ?? []);
    } catch {
      setMessage('Welcome to EduRithm! Let\'s start building your coding skills.');
    } finally {
      setLoading(false);
    }
  }

  function finish() {
    localStorage.setItem(STORAGE_KEY, '1');
    localStorage.setItem(LEVEL_KEY, level);
    localStorage.setItem(TRACK_KEY, track);
    setFading(true);
    setTimeout(() => {
      setVisible(false);
      const q = concepts[0] ? `?search=${encodeURIComponent(concepts[0])}` : '';
      setLocation(`/learn${q}`);
    }, 500);
  }

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: '#0a0a0a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'opacity 0.5s ease',
        opacity: fading ? 0 : 1,
        padding: '1.5rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: 560, color: '#fff' }}>

        {/* Brand */}
        <p style={{ fontSize: '0.75rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)', marginBottom: '2rem', fontWeight: 600 }}>
          EDURITHM
        </p>

        {/* ── Step 1: Level ── */}
        {step === 1 && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.2rem)', fontWeight: 800, lineHeight: 1.15, marginBottom: '0.5rem' }}>
              What's your coding level?
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', marginBottom: '2rem', fontSize: '0.95rem' }}>
              Be honest — we'll meet you exactly where you are.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {LEVELS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => { setLevel(l.id); setStep(2); }}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 12,
                    padding: '1rem 1.25rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: '#fff',
                    transition: 'background 0.2s, border-color 0.2s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(180,220,60,0.12)'; (e.currentTarget as HTMLElement).style.borderColor = '#b4dc3c'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}
                >
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{l.label}</div>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', marginTop: 2 }}>{l.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: Track ── */}
        {step === 2 && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.2rem)', fontWeight: 800, lineHeight: 1.15, marginBottom: '0.5rem' }}>
              What do you want to learn?
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', marginBottom: '2rem', fontSize: '0.95rem' }}>
              Pick one to start — you can explore others anytime.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {TRACKS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => chooseTrack(t.id)}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 12,
                    padding: '1.25rem 1rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: '#fff',
                    transition: 'background 0.2s, border-color 0.2s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(180,220,60,0.12)'; (e.currentTarget as HTMLElement).style.borderColor = '#b4dc3c'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}
                >
                  <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>{t.emoji}</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{t.label}</div>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', marginTop: 2 }}>{t.desc}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(1)}
              style={{ marginTop: '1.5rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              ← Back
            </button>
          </div>
        )}

        {/* ── Step 3: Gemini welcome ── */}
        {step === 3 && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <p style={{ fontSize: '0.75rem', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: '1.25rem', fontWeight: 600 }}>
              GEMINI AI
            </p>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#b4dc3c', animation: 'pulse 1s infinite' }} />
                Preparing your learning path…
              </div>
            ) : (
              <>
                <p style={{ fontSize: 'clamp(1rem,2.5vw,1.2rem)', lineHeight: 1.7, color: 'rgba(255,255,255,0.85)', marginBottom: '2rem' }}>
                  {message}
                </p>
                {concepts.length > 0 && (
                  <div style={{ marginBottom: '1.75rem' }}>
                    <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', marginBottom: '0.6rem', fontWeight: 600 }}>YOUR FIRST CONCEPTS</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {concepts.map((c) => (
                        <span key={c} style={{ background: 'rgba(180,220,60,0.15)', border: '1px solid rgba(180,220,60,0.3)', borderRadius: 20, padding: '0.3rem 0.8rem', fontSize: '0.8rem', color: '#b4dc3c', fontWeight: 600 }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  onClick={finish}
                  style={{
                    background: '#b4dc3c', color: '#0a0a0a',
                    border: 'none', borderRadius: 10,
                    padding: '0.9rem 2rem', fontWeight: 800,
                    fontSize: '0.95rem', cursor: 'pointer',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Start learning →
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
