import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

// ── localStorage keys ────────────────────────────────────────────────────────
export const STORAGE_ONBOARDED  = 'edurithm_onboarded';
export const STORAGE_LEVEL      = 'edurithm_level';
export const STORAGE_TRACK      = 'edurithm_track';
export const STORAGE_CURRICULUM = 'edurithm_curriculum';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

// ── Types (mirrored from API) ────────────────────────────────────────────────
export interface CurriculumTopic {
  title: string;
  what: string;
  goal: string;
  ytSearch: string;
}
export interface CurriculumWeek {
  week: number;
  theme: string;
  topics: CurriculumTopic[];
}
export interface Curriculum {
  title: string;
  weeks: CurriculumWeek[];
}

// ── Static option data ───────────────────────────────────────────────────────
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

// ── Week colours ─────────────────────────────────────────────────────────────
const WEEK_COLORS = ['#d7f34b', '#60a5fa', '#f97316'];

// ── Component ────────────────────────────────────────────────────────────────
export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [visible, setVisible]       = useState(false);
  const [fading, setFading]         = useState(false);
  const [step, setStep]             = useState(1); // 1=level 2=track 3=curriculum
  const [level, setLevel]           = useState('');
  const [track, setTrack]           = useState('');
  const [message, setMessage]       = useState('');
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [concepts, setConcepts]     = useState<string[]>([]);
  const [loading, setLoading]       = useState(false);
  const [openWeek, setOpenWeek]     = useState(0); // index of expanded week

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_ONBOARDED)) setVisible(true);
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
      setCurriculum(data.curriculum ?? null);
      setConcepts(data.recommendedConcepts ?? []);
    } catch {
      setMessage("Welcome to EduRithm! Let's start building your coding skills together.");
      setCurriculum(null);
    } finally {
      setLoading(false);
    }
  }

  function finish() {
    localStorage.setItem(STORAGE_ONBOARDED, '1');
    localStorage.setItem(STORAGE_LEVEL, level);
    localStorage.setItem(STORAGE_TRACK, track);
    if (curriculum) localStorage.setItem(STORAGE_CURRICULUM, JSON.stringify(curriculum));
    setFading(true);
    setTimeout(() => {
      setVisible(false);
      const q = concepts[0] ? `?search=${encodeURIComponent(concepts[0])}` : '';
      setLocation(`/learn${q}`);
    }, 500);
  }

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: '#0a0a0a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'opacity 0.5s ease',
      opacity: fading ? 0 : 1,
      padding: '1.25rem',
      overflowY: 'auto',
    }}>
      <div style={{ width: '100%', maxWidth: 600, color: '#fff', paddingTop: '1rem', paddingBottom: '2rem' }}>

        {/* Brand */}
        <p style={{ fontSize: '0.72rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.3)', marginBottom: '2.5rem', fontWeight: 700 }}>
          EDURITHM
        </p>

        {/* ── Step 1: Level ── */}
        {step === 1 && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <h1 style={{ fontSize: 'clamp(1.7rem,4vw,2.4rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '0.5rem' }}>
              What's your coding level?
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '2rem', fontSize: '0.92rem' }}>
              Be honest — we'll personalise your entire learning path around it.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {LEVELS.map((l) => (
                <OptionButton key={l.id} label={l.label} desc={l.desc}
                  onClick={() => { setLevel(l.id); setStep(2); }} />
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: Track ── */}
        {step === 2 && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <h1 style={{ fontSize: 'clamp(1.7rem,4vw,2.4rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '0.5rem' }}>
              What do you want to learn?
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '2rem', fontSize: '0.92rem' }}>
              Pick one to start — you can explore others anytime.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {TRACKS.map((t) => (
                <TrackButton key={t.id} {...t} onClick={() => chooseTrack(t.id)} />
              ))}
            </div>
            <button onClick={() => setStep(1)} style={backBtnStyle}>← Back</button>
          </div>
        )}

        {/* ── Step 3: Curriculum ── */}
        {step === 3 && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            {loading ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
                  <Spinner /> Building your personalised 3-week curriculum…
                </div>
                {[1,2,3].map(i => (
                  <div key={i} style={{ height: 80, borderRadius: 12, background: 'rgba(255,255,255,0.05)', marginBottom: '0.75rem', animation: 'pulse 1.4s ease infinite' }} />
                ))}
              </div>
            ) : (
              <>
                {/* AI badge */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(215,243,75,0.12)', border: '1px solid rgba(215,243,75,0.25)', borderRadius: 20, padding: '0.3rem 0.8rem', marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '0.65rem', letterSpacing: '0.1em', color: '#d7f34b', fontWeight: 700 }}>✦ GEMINI GENERATED</span>
                </div>

                {/* Welcome */}
                <p style={{ fontSize: 'clamp(0.95rem,2.2vw,1.1rem)', lineHeight: 1.75, color: 'rgba(255,255,255,0.8)', marginBottom: '1.75rem' }}>
                  {message}
                </p>

                {/* Curriculum title */}
                {curriculum && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                      <h2 style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>{curriculum.title}</h2>
                      <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>3 weeks · 9 topics</span>
                    </div>

                    {/* Week accordion */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '2rem' }}>
                      {curriculum.weeks.map((week, wi) => {
                        const color = WEEK_COLORS[wi] ?? '#d7f34b';
                        const isOpen = openWeek === wi;
                        return (
                          <div key={week.week} style={{ borderRadius: 12, border: `1px solid rgba(255,255,255,0.1)`, overflow: 'hidden' }}>
                            {/* Week header */}
                            <button
                              onClick={() => setOpenWeek(isOpen ? -1 : wi)}
                              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '0.875rem 1rem', background: isOpen ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#fff' }}
                            >
                              <span style={{ width: 26, height: 26, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#0a0a0a', flexShrink: 0 }}>
                                {week.week}
                              </span>
                              <span style={{ flex: 1 }}>
                                <span style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem' }}>Week {week.week}</span>
                                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>{week.theme}</span>
                              </span>
                              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', marginLeft: 4 }}>▼</span>
                            </button>

                            {/* Topics */}
                            {isOpen && (
                              <div style={{ padding: '0.25rem 0.75rem 0.75rem' }}>
                                {week.topics.map((topic, ti) => (
                                  <TopicCard key={ti} topic={topic} color={color} />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Recommended concepts */}
                {concepts.length > 0 && (
                  <div style={{ marginBottom: '1.75rem' }}>
                    <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: '0.6rem', fontWeight: 700 }}>START WITH THESE CONCEPTS</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                      {concepts.map((c) => (
                        <span key={c} style={{ background: 'rgba(215,243,75,0.12)', border: '1px solid rgba(215,243,75,0.25)', borderRadius: 20, padding: '0.3rem 0.85rem', fontSize: '0.78rem', color: '#d7f34b', fontWeight: 700 }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={finish} style={primaryBtnStyle}>
                  Begin Week 1 →
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes pulse   { 0%,100% { opacity: 0.5; } 50% { opacity: 0.15; } }
      `}</style>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function OptionButton({ label, desc, onClick }: { label: string; desc: string; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: hover ? 'rgba(215,243,75,0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${hover ? '#d7f34b' : 'rgba(255,255,255,0.1)'}`, borderRadius: 12, padding: '1rem 1.25rem', textAlign: 'left', cursor: 'pointer', color: '#fff', transition: 'all 0.18s' }}>
      <div style={{ fontWeight: 700, fontSize: '1rem' }}>{label}</div>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', marginTop: 3 }}>{desc}</div>
    </button>
  );
}

function TrackButton({ label, desc, emoji, onClick }: { label: string; desc: string; emoji: string; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: hover ? 'rgba(215,243,75,0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${hover ? '#d7f34b' : 'rgba(255,255,255,0.1)'}`, borderRadius: 12, padding: '1.25rem 1rem', textAlign: 'left', cursor: 'pointer', color: '#fff', transition: 'all 0.18s' }}>
      <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>{emoji}</div>
      <div style={{ fontWeight: 700, fontSize: '1rem' }}>{label}</div>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: 3 }}>{desc}</div>
    </button>
  );
}

function TopicCard({ topic, color }: { topic: CurriculumTopic; color: string }) {
  const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(topic.ytSearch)}`;
  return (
    <div style={{ borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', padding: '0.875rem 1rem', marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>{topic.title}</span>
        <a href={ytUrl} target="_blank" rel="noreferrer"
          style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20, padding: '0.25rem 0.65rem', fontSize: '0.65rem', color: '#fca5a5', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          ▶ Video
        </a>
      </div>
      <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginTop: 4, lineHeight: 1.5 }}>{topic.what}</p>
      <div style={{ marginTop: 8, padding: '0.5rem 0.75rem', borderRadius: 8, background: `${color}14`, borderLeft: `3px solid ${color}` }}>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: color, display: 'block', marginBottom: 2 }}>SESSION GOAL</span>
        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{topic.goal}</span>
      </div>
    </div>
  );
}

function Spinner() {
  return <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(215,243,75,0.3)', borderTopColor: '#d7f34b', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />;
}

const backBtnStyle: React.CSSProperties = { marginTop: '1.5rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '0.8rem' };
const primaryBtnStyle: React.CSSProperties = { background: '#d7f34b', color: '#0a0a0a', border: 'none', borderRadius: 10, padding: '0.9rem 2.25rem', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', letterSpacing: '-0.01em' };
