import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Map,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useListLearnConcepts, getListLearnConceptsQueryKey, useJoinWaitlist } from '@workspace/api-client-react';
import { ErrorState, PageTitle, SkeletonBlock, StudentNav, EmptyState } from '@/components/shared';
import { type Curriculum, STORAGE_CURRICULUM, resetOnboarding } from '@/components/Onboarding';

// ─── helpers ────────────────────────────────────────────────────────────────

function isHtml(code: string) {
  const t = code.trimStart().toLowerCase();
  return t.startsWith('<!doctype') || t.startsWith('<html');
}

function filename(title: string, code: string) {
  return isHtml(code) ? 'index.html' : 'example.py';
}

// ─── Live IDE ────────────────────────────────────────────────────────────────

function LiveIde({
  original,
  title,
  onCodeChange,
}: {
  original: string;
  title: string;
  onCodeChange?: (code: string) => void;
}) {
  const [code, setCode] = useState(original);
  const html = isHtml(original);

  // Reset editor when concept changes
  useEffect(() => {
    setCode(original);
    onCodeChange?.(original);
  }, [original]);

  function handleChange(next: string) {
    setCode(next);
    onCodeChange?.(next);
  }

  return (
    <div className="mt-7 overflow-hidden rounded-xl border border-[#dedbd2] bg-[#162239]" data-testid="ide-container">
      {/* Title bar */}
      <div className="flex items-center justify-between border-b border-[#40506a] bg-[#0f1a2b] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ef775b]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#d7f34b]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#4f6177]" />
          <span className="ml-2 font-mono text-[.65rem] text-[#7b91a8]">{filename(title, original)}</span>
        </div>
        <div className="flex items-center gap-3">
          {!html && (
            <span className="rounded-full bg-[#1e2d45] px-2.5 py-1 font-mono text-[.6rem] text-[#9db3c8]">
              Python runs server-side — edit &amp; read below
            </span>
          )}
          <button
            onClick={() => setCode(original)}
            className="flex items-center gap-1.5 rounded-lg border border-[#40506a] bg-transparent px-2.5 py-1 font-mono text-[.65rem] text-[#9db3c8] transition hover:border-[#7b91a8] hover:text-[#f7f3ea]"
            title="Reset to original"
            data-testid="button-ide-reset"
          >
            <RefreshCw size={10} /> Reset
          </button>
        </div>
      </div>

      {html ? (
        /* ── HTML: resizable editor | browser preview ── */
        <PanelGroup direction="horizontal" className="min-h-[420px]">
          {/* Editor panel */}
          <Panel defaultSize={50} minSize={25}>
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-2 border-b border-[#40506a] bg-[#162239] px-4 py-2">
                <span className="font-mono text-[.6rem] font-bold uppercase tracking-wider text-[#5b7a9a]">Editor</span>
              </div>
              <textarea
                className="code-area flex-1 w-full resize-none border-0 bg-[#162239] p-5 font-mono text-[.76rem] leading-6 text-[#e5ebdf] outline-none"
                value={code}
                onChange={(e) => handleChange(e.target.value)}
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                data-testid="input-ide-editor"
              />
            </div>
          </Panel>

          {/* Drag handle */}
          <PanelResizeHandle className="group w-1.5 bg-[#40506a] transition hover:bg-[#d7f34b] active:bg-[#d7f34b]">
            <div className="mx-auto mt-[50%] h-6 w-0.5 rounded-full bg-[#5b7a9a] opacity-0 transition group-hover:opacity-100" />
          </PanelResizeHandle>

          {/* Preview panel */}
          <Panel defaultSize={50} minSize={25}>
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-2 border-b border-[#40506a] bg-[#0f1a2b] px-4 py-2">
                <span className="font-mono text-[.6rem] font-bold uppercase tracking-wider text-[#5b7a9a]">Preview</span>
                <span className="ml-auto flex items-center gap-1 font-mono text-[.6rem] text-[#3d7a40]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#8da923]" /> live
                </span>
              </div>
              <iframe
                title="Live HTML preview"
                srcDoc={code}
                className="flex-1 w-full bg-white"
                sandbox="allow-scripts"
                data-testid="frame-ide-preview"
              />
            </div>
          </Panel>
        </PanelGroup>
      ) : (
        /* ── Python: editable code, no iframe (can't run in browser) ── */
        <div className="flex flex-col">
          <div className="flex items-center gap-2 border-b border-[#40506a] bg-[#162239] px-4 py-2">
            <span className="font-mono text-[.6rem] font-bold uppercase tracking-wider text-[#5b7a9a]">Code</span>
            <span className="ml-auto font-mono text-[.6rem] text-[#5b7a9a]">
              Edit freely — changes won't be graded here
            </span>
          </div>
          <textarea
            className="code-area min-h-[340px] w-full resize-y border-0 bg-[#162239] p-5 font-mono text-[.76rem] leading-6 text-[#e5ebdf] outline-none"
            value={code}
            onChange={(e) => handleChange(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            data-testid="input-ide-editor"
          />
        </div>
      )}
    </div>
  );
}

// ─── Coming Soon / Waitlist ──────────────────────────────────────────────────

const AREAS = [
  { value: 'IoT', label: 'Internet of Things (IoT)' },
  { value: 'Computer Networking', label: 'Computer Networking' },
  { value: 'Digital Literacy', label: 'Digital Literacy' },
  { value: 'AI', label: 'Artificial Intelligence' },
];

function ComingSoonSection() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const join = useJoinWaitlist();

  function toggleArea(value: string) {
    setInterests((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  function submit() {
    if (!name.trim() || !email.trim() || interests.length === 0) return;
    join.mutate(
      { data: { name: name.trim(), email: email.trim(), interests } },
      {
        onSuccess: (data) => {
          setSuccessMsg(data.message);
          setSubmitted(true);
        },
      }
    );
  }

  return (
    <section className="mt-16 mb-4" data-testid="section-coming-soon">
      <div className="rounded-3xl bg-[#162239] px-7 py-10 sm:px-12 sm:py-14 relative overflow-hidden">
        {/* Decorative dots */}
        <div className="pointer-events-none absolute right-8 top-8 grid grid-cols-4 gap-2 opacity-10">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="h-1.5 w-1.5 rounded-full bg-[#d7f34b]" />
          ))}
        </div>

        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#d7f34b]/30 bg-[#d7f34b]/10 px-3 py-1.5 text-xs font-bold text-[#d7f34b]">
            <Sparkles size={12} /> Coming soon
          </span>

          <h2 className="mt-5 font-display text-3xl font-bold leading-tight text-[#f7f3ea] sm:text-4xl">
            EduRithm is expanding.
          </h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-[#9db3c8]">
            New subject areas are on the way — join the waitlist and we'll reach
            out when your area of interest goes live.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {AREAS.map((area) => (
              <span
                key={area.value}
                className="rounded-full border border-[#40506a] bg-[#1e2d45] px-3.5 py-1.5 text-sm font-bold text-[#b6c2d1]"
              >
                {area.value}
              </span>
            ))}
          </div>

          <div className="my-8 border-t border-[#2d3f57]" />

          {submitted ? (
            <div
              className="flex items-start gap-4 rounded-2xl bg-[#d7f34b]/10 border border-[#d7f34b]/20 p-5"
              data-testid="state-waitlist-success"
            >
              <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#d7f34b] text-[#162239]">
                <Check size={14} strokeWidth={3} />
              </div>
              <div>
                <p className="font-bold text-[#f7f3ea]">You're on the list!</p>
                <p className="mt-1 text-sm text-[#9db3c8]">{successMsg}</p>
              </div>
            </div>
          ) : (
            <div className="max-w-xl" data-testid="form-waitlist">
              <p className="mb-5 text-sm font-bold uppercase tracking-[.1em] text-[#7b8ea6]">
                Join the waitlist
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-[#9db3c8] mb-1.5" htmlFor="waitlist-name">
                    Your name
                  </label>
                  <input
                    id="waitlist-name"
                    className="w-full rounded-lg border border-[#40506a] bg-[#1e2d45] px-3 py-2.5 text-sm text-[#f7f3ea] placeholder-[#4f6177] outline-none transition focus:border-[#d7f34b] focus:ring-2 focus:ring-[#d7f34b]/20"
                    placeholder="Ada Lovelace"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    data-testid="input-waitlist-name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#9db3c8] mb-1.5" htmlFor="waitlist-email">
                    Email address
                  </label>
                  <input
                    id="waitlist-email"
                    type="email"
                    className="w-full rounded-lg border border-[#40506a] bg-[#1e2d45] px-3 py-2.5 text-sm text-[#f7f3ea] placeholder-[#4f6177] outline-none transition focus:border-[#d7f34b] focus:ring-2 focus:ring-[#d7f34b]/20"
                    placeholder="ada@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="input-waitlist-email"
                  />
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-bold text-[#9db3c8] mb-2.5">Area of interest</p>
                <div className="flex flex-wrap gap-2">
                  {AREAS.map((area) => {
                    const checked = interests.includes(area.value);
                    return (
                      <button
                        key={area.value}
                        type="button"
                        onClick={() => toggleArea(area.value)}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-bold transition-colors ${
                          checked
                            ? 'border-[#d7f34b] bg-[#d7f34b]/15 text-[#d7f34b]'
                            : 'border-[#40506a] bg-[#1e2d45] text-[#9db3c8] hover:border-[#7b8ea6]'
                        }`}
                        data-testid={`checkbox-waitlist-${area.value.replace(/\s+/g, '-')}`}
                      >
                        {checked && <Check size={12} strokeWidth={3} />}
                        {area.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {join.isError && (
                <p className="mt-3 text-sm text-[#ef775b]" data-testid="status-waitlist-error">
                  Something went wrong. Please try again.
                </p>
              )}

              <button
                className="btn-primary mt-6"
                disabled={!name.trim() || !email.trim() || interests.length === 0 || join.isPending}
                onClick={submit}
                data-testid="button-waitlist-submit"
              >
                {join.isPending ? (
                  <><Loader2 size={15} className="animate-spin" /> Saving…</>
                ) : (
                  <>Notify me when it launches</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

const WEEK_COLORS = ['#d7f34b', '#60a5fa', '#f97316'];

type ChatMsg = { role: 'student' | 'assistant'; content: string };

export default function LearnPage() {
  const conceptsQuery = useListLearnConcepts({ query: { queryKey: getListLearnConceptsQueryKey() } });
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [sideTab, setSideTab]   = useState<'browse' | 'mypath'>('browse');
  const [openWeek, setOpenWeek] = useState(0);

  // Curriculum from localStorage (generated during onboarding)
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);

  // Gemini IDE chat state
  const [activeCode, setActiveCode]   = useState('');
  const [chatOpen, setChatOpen]       = useState(true);
  const [messages, setMessages]       = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput]     = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionGoal, setSessionGoal] = useState<string | null>(null);
  const [sessionTopic, setSessionTopic] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const pendingSendRef = useRef<string | null>(null);

  // Load curriculum + URL search param on mount
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_CURRICULUM);
    if (raw) { try { setCurriculum(JSON.parse(raw)); } catch {} }
    const params = new URLSearchParams(window.location.search);
    const q = params.get('search');
    if (q) setSearch(q);
  }, []);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  // Reset chat when concept changes
  useEffect(() => {
    setMessages([]);
    setChatInput('');
    setSessionGoal(null);
    setSessionTopic(null);
  }, [selected]);

  // Fire pending auto-message after chat opens
  useEffect(() => {
    if (chatOpen && pendingSendRef.current) {
      const q = pendingSendRef.current;
      pendingSendRef.current = null;
      setTimeout(() => sendMessage(q), 150);
    }
  }, [chatOpen]);

  const concepts = conceptsQuery.data ?? [];
  const filtered = useMemo(
    () =>
      concepts.filter((concept) =>
        `${concept.title} ${concept.summary}`.toLowerCase().includes(search.toLowerCase())
      ),
    [concepts, search]
  );
  const active = concepts.find((concept) => concept.id === selected) ?? filtered[0];

  async function sendMessage(question: string, goal?: string | null) {
    if (!active || !question.trim() || chatLoading) return;
    const userMsg: ChatMsg = { role: 'student', content: question.trim() };
    const history = [...messages];
    setMessages((m) => [...m, userMsg]);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await fetch(`${BASE}/api/ai/ide-assist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conceptTitle: active.title,
          conceptExplanation: active.explanation ?? '',
          currentCode: activeCode || active.codeExample,
          history,
          question: question.trim(),
          sessionGoal: goal ?? sessionGoal ?? undefined,
        }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: 'assistant', content: data.reply ?? 'Sorry, I could not respond.' }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  }

  // Called when a student taps a "My Path" topic — kicks off a guided session
  function startPathTopic(topicTitle: string, topicWhat: string, goal: string) {
    // Try to match a concept in the DB
    const match = concepts.find((c) =>
      c.title.toLowerCase().includes(topicTitle.toLowerCase()) ||
      topicTitle.toLowerCase().includes(c.title.toLowerCase().split(' ')[0])
    );
    if (match) setSelected(match.id);

    setSessionGoal(goal);
    setSessionTopic(topicTitle);
    setSideTab('browse');
    setChatOpen(true);

    const openMsg = `I'm ready to study "${topicTitle}". My goal for this session: ${goal} — can you help me get started?`;
    // If a concept was just selected, messages reset in the useEffect above, so queue via ref
    if (match && match.id !== selected) {
      pendingSendRef.current = openMsg;
    } else {
      setMessages([]);
      setTimeout(() => sendMessage(openMsg, goal), 120);
    }
  }

  return (
    <div className="noise app-shell bg-[#f7f3ea]">
      <StudentNav />
      <main className="mx-auto max-w-[1440px] px-5 pb-20 pt-10 lg:px-8 lg:pt-14">
        <PageTitle
          eyebrow="The quiet corner"
          title="Learn in layers."
          detail="Pick a concept, read the explanation, then edit the code and watch it come alive in the preview panel."
        >
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-3 text-[#7b8491]" />
            <input
              className="field pl-9"
              placeholder="Search concepts"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-concepts"
            />
          </div>
        </PageTitle>

        <div className="mt-10 grid gap-6 lg:grid-cols-[280px_1fr]">
          {conceptsQuery.isLoading ? (
            <>
              <div className="space-y-3">
                <SkeletonBlock className="h-24" />
                <SkeletonBlock className="h-24" />
                <SkeletonBlock className="h-24" />
              </div>
              <SkeletonBlock className="h-[600px]" />
            </>
          ) : conceptsQuery.isError ? (
            <div className="lg:col-span-2">
              <ErrorState message="The library is still being shelved." onRetry={() => conceptsQuery.refetch()} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="lg:col-span-2">
              <EmptyState title="No concept found" detail="Try a shorter search, or browse every concept from the beginning." />
            </div>
          ) : (
            <>
              {/* ── Sidebar ── */}
              <div className="lg:max-h-[calc(100vh-160px)] lg:overflow-y-auto lg:pr-1">

                {/* Tab switcher */}
                <div className="mb-3 flex gap-1 rounded-xl bg-[#e8e4db] p-1">
                  <button
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${sideTab === 'browse' ? 'bg-white text-[#162239] shadow-sm' : 'text-[#687386] hover:text-[#162239]'}`}
                    onClick={() => setSideTab('browse')}
                  >
                    <Search size={12} /> Browse
                  </button>
                  <button
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${sideTab === 'mypath' ? 'bg-white text-[#162239] shadow-sm' : 'text-[#687386] hover:text-[#162239]'}`}
                    onClick={() => setSideTab('mypath')}
                    data-testid="button-mypath-tab"
                  >
                    <Map size={12} /> My Path
                  </button>
                </div>

                {/* Browse tab */}
                {sideTab === 'browse' && (
                  <div className="space-y-2.5">
                    {filtered.map((concept, index) => (
                      <button
                        key={concept.id}
                        className={`focus-ring card-lift flex w-full items-start gap-3 p-4 text-left ${
                          active?.id === concept.id ? 'border-[#9ebc28] bg-[#edf4c9]' : ''
                        }`}
                        onClick={() => setSelected(concept.id)}
                        data-testid={`button-concept-${concept.id}`}
                      >
                        <span className="mt-0.5 shrink-0 font-mono text-xs font-bold text-[#8da923]">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span>
                          <span className="block font-display text-base font-bold text-[#162239]">{concept.title}</span>
                          <span className="mt-0.5 block text-sm leading-snug text-[#687386]">{concept.summary}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* My Path tab */}
                {sideTab === 'mypath' && (
                  <div>
                    {!curriculum ? (
                      <div className="rounded-xl border border-[#dedbd2] bg-white p-5 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#162239]">
                          <Sparkles size={20} className="text-[#d7f34b]" />
                        </div>
                        <p className="text-sm font-bold text-[#162239]">No learning path yet</p>
                        <p className="mt-1 text-xs leading-relaxed text-[#687386]">
                          Gemini will build you a personalised 3-week plan — topics, session goals, and YouTube videos — based on your level and track.
                        </p>
                        <button
                          onClick={resetOnboarding}
                          className="mt-4 w-full rounded-xl bg-[#162239] py-2.5 text-xs font-bold text-[#d7f34b] transition hover:bg-[#1e2d45]"
                        >
                          ✦ Set up my learning path
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="mb-2 font-mono text-[.65rem] font-bold uppercase tracking-wider text-[#8da923]">{curriculum.title}</p>
                        {curriculum.weeks.map((week, wi) => {
                          const color = WEEK_COLORS[wi] ?? '#d7f34b';
                          const isOpen = openWeek === wi;
                          return (
                            <div key={week.week} className="overflow-hidden rounded-xl border border-[#dedbd2] bg-white">
                              <button
                                className="flex w-full items-center gap-3 px-4 py-3 text-left"
                                onClick={() => setOpenWeek(isOpen ? -1 : wi)}
                              >
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[.65rem] font-black text-[#0a0a0a]" style={{ background: color }}>
                                  {week.week}
                                </span>
                                <span className="flex-1">
                                  <span className="block text-xs font-bold text-[#162239]">Week {week.week}</span>
                                  <span className="block text-[.7rem] text-[#687386]">{week.theme}</span>
                                </span>
                                {isOpen ? <ChevronUp size={14} className="text-[#c8d0da]" /> : <ChevronDown size={14} className="text-[#c8d0da]" />}
                              </button>
                              {isOpen && (
                                <div className="space-y-2 px-3 pb-3">
                                  {week.topics.map((topic, ti) => {
                                    const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(topic.ytSearch)}`;
                                    return (
                                      <div key={ti} className="rounded-lg border border-[#e8e4db] bg-[#f7f3ea] p-3">
                                        <div className="flex items-start justify-between gap-2">
                                          <span className="text-xs font-bold text-[#162239] leading-snug">{topic.title}</span>
                                          <a href={ytUrl} target="_blank" rel="noreferrer"
                                            className="flex shrink-0 items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[.6rem] font-bold text-red-500 no-underline"
                                          >▶ Video</a>
                                        </div>
                                        <p className="mt-1 text-[.7rem] leading-snug text-[#687386]">{topic.what}</p>
                                        <div className="mt-2 rounded-md px-2.5 py-1.5" style={{ background: `${color}22`, borderLeft: `3px solid ${color}` }}>
                                          <span className="block text-[.6rem] font-bold uppercase tracking-wider" style={{ color }}>Goal</span>
                                          <span className="text-[.7rem] text-[#536078] leading-snug">{topic.goal}</span>
                                        </div>
                                        <button
                                          className="mt-2 w-full rounded-lg border border-[#162239] bg-[#162239] py-1.5 text-[.7rem] font-bold text-[#d7f34b] transition hover:bg-[#1e2d45]"
                                          onClick={() => startPathTopic(topic.title, topic.what, topic.goal)}
                                        >
                                          Practise with Gemini →
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Detail panel ── */}
              {active && (
                <article className="card-lift overflow-hidden p-0" data-testid={`article-concept-${active.id}`}>
                  {/* Session goal banner */}
                  {sessionGoal && (
                    <div className="flex items-start gap-3 border-b border-[#d7f34b]/40 bg-[#162239] px-7 py-3">
                      <Sparkles size={14} className="mt-0.5 shrink-0 text-[#d7f34b]" />
                      <div>
                        <span className="block text-[.65rem] font-bold uppercase tracking-wider text-[#d7f34b]">Session goal — {sessionTopic}</span>
                        <span className="text-xs text-[rgba(255,255,255,0.7)]">{sessionGoal}</span>
                      </div>
                    </div>
                  )}

                  {/* Header */}
                  <div className="flex items-start justify-between gap-5 border-b border-[#dedbd2] px-7 py-6">
                    <div>
                      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#162239] px-3 py-1.5 text-xs font-bold text-[#d7f34b]">
                        <BookOpen size={13} /> concept note
                      </div>
                      <h2 className="font-display text-2xl font-bold tracking-tight text-[#162239] sm:text-3xl">
                        {active.title}
                      </h2>
                      <p className="mt-2 text-base leading-relaxed text-[#536078]">{active.explanation}</p>
                    </div>
                    {active.youtubeUrl && (
                      <a
                        href={active.youtubeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-outline shrink-0 min-h-9 px-3 text-xs"
                        data-testid="link-concept-video"
                      >
                        <ExternalLink size={14} /> Watch video
                      </a>
                    )}
                  </div>

                  {/* Live IDE */}
                  <div className="px-7 pb-4">
                    <LiveIde
                      key={active.id}
                      original={active.codeExample}
                      title={active.title}
                      onCodeChange={setActiveCode}
                    />
                  </div>

                  {/* ── Gemini IDE Assistant ── */}
                  <div className="border-t border-[#e6e1d7] mx-7 mb-7">
                    {/* Toggle bar */}
                    <button
                      className="flex w-full items-center justify-between gap-3 py-3.5 text-left"
                      onClick={() => setChatOpen((o) => !o)}
                      data-testid="button-gemini-toggle"
                    >
                      <span className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#162239]">
                          <Sparkles size={12} className="text-[#d7f34b]" />
                        </span>
                        <span className="font-bold text-sm text-[#162239]">Ask Gemini</span>
                        <span className="rounded-full bg-[#edf4c9] px-2 py-0.5 text-[.65rem] font-bold text-[#3d5718]">AI tutor</span>
                      </span>
                      {chatOpen
                        ? <ChevronUp size={16} className="text-[#7b8491]" />
                        : <ChevronDown size={16} className="text-[#7b8491]" />}
                    </button>

                    {chatOpen && (
                      <div className="overflow-hidden rounded-xl border border-[#dedbd2] bg-[#0f1a2b]">
                        {/* Quick actions */}
                        <div className="flex flex-wrap gap-2 border-b border-[#40506a] px-4 py-3">
                          <button
                            className="flex items-center gap-1.5 rounded-full border border-[#40506a] bg-transparent px-3 py-1.5 font-mono text-[.65rem] text-[#9db3c8] transition hover:border-[#d7f34b] hover:text-[#d7f34b]"
                            onClick={() => sendMessage('Give me a coding challenge for this concept 🎯')}
                            disabled={chatLoading}
                          >
                            <Zap size={11} /> Challenge me
                          </button>
                          <button
                            className="flex items-center gap-1.5 rounded-full border border-[#40506a] bg-transparent px-3 py-1.5 font-mono text-[.65rem] text-[#9db3c8] transition hover:border-[#d7f34b] hover:text-[#d7f34b]"
                            onClick={() => sendMessage('Check my code against the last challenge')}
                            disabled={chatLoading}
                          >
                            <Sparkles size={11} /> Check my code
                          </button>
                          <button
                            className="flex items-center gap-1.5 rounded-full border border-[#40506a] bg-transparent px-3 py-1.5 font-mono text-[.65rem] text-[#9db3c8] transition hover:border-[#d7f34b] hover:text-[#d7f34b]"
                            onClick={() => sendMessage("Explain this concept to me like I'm completely new to coding")}
                            disabled={chatLoading}
                          >
                            <Sparkles size={11} /> Explain simply
                          </button>
                        </div>

                        {/* Messages */}
                        {messages.length > 0 && (
                          <div className="max-h-72 overflow-y-auto px-4 py-3 space-y-3">
                            {messages.map((m, i) => (
                              <div
                                key={i}
                                className={`flex ${m.role === 'student' ? 'justify-end' : 'justify-start'}`}
                              >
                                <div
                                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                                    m.role === 'student'
                                      ? 'bg-[#d7f34b] text-[#162239] font-medium'
                                      : 'bg-[#1e3050] text-[#c8d8e8]'
                                  }`}
                                >
                                  {m.content}
                                </div>
                              </div>
                            ))}
                            {chatLoading && (
                              <div className="flex justify-start">
                                <div className="rounded-xl bg-[#1e3050] px-4 py-3">
                                  <Loader2 size={14} className="animate-spin text-[#9db3c8]" />
                                </div>
                              </div>
                            )}
                            <div ref={chatEndRef} />
                          </div>
                        )}

                        {messages.length === 0 && !chatLoading && (
                          <div className="px-4 py-5">
                            <p className="text-xs text-[#5b7a9a] font-mono mb-3">
                              Your AI tutor is ready. Try one of these to get started:
                            </p>
                            <div className="space-y-2">
                              {[
                                `Explain ${active.title} to me in simple terms`,
                                `What can I actually build with ${active.title}?`,
                                `I don't understand the code — walk me through it`,
                              ].map((q) => (
                                <button
                                  key={q}
                                  onClick={() => sendMessage(q)}
                                  className="w-full rounded-lg border border-[#40506a] bg-transparent px-3 py-2 text-left font-mono text-[.65rem] text-[#9db3c8] transition hover:border-[#d7f34b] hover:text-[#d7f34b]"
                                >
                                  "{q}"
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Input */}
                        <div className="flex items-center gap-2 border-t border-[#40506a] px-4 py-3">
                          <input
                            className="flex-1 bg-transparent font-mono text-[.76rem] text-[#e5ebdf] placeholder:text-[#40506a] outline-none"
                            placeholder="Ask Gemini anything…"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(chatInput); } }}
                            disabled={chatLoading}
                            data-testid="input-gemini-chat"
                          />
                          <button
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#d7f34b] text-[#162239] transition hover:bg-[#c5e042] disabled:opacity-40"
                            onClick={() => sendMessage(chatInput)}
                            disabled={!chatInput.trim() || chatLoading}
                            data-testid="button-gemini-send"
                          >
                            <Send size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              )}
            </>
          )}
        </div>

        {/* Coming Soon / Waitlist */}
        <ComingSoonSection />
      </main>
    </div>
  );
}
