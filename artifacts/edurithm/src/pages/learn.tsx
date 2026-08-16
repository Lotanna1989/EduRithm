import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useListLearnConcepts, getListLearnConceptsQueryKey, useJoinWaitlist } from '@workspace/api-client-react';
import { ErrorState, PageTitle, SkeletonBlock, StudentNav, EmptyState } from '@/components/shared';

// ─── helpers ────────────────────────────────────────────────────────────────

function isHtml(code: string) {
  const t = code.trimStart().toLowerCase();
  return t.startsWith('<!doctype') || t.startsWith('<html');
}

function filename(title: string, code: string) {
  return isHtml(code) ? 'index.html' : 'example.py';
}

// ─── Live IDE ────────────────────────────────────────────────────────────────

function LiveIde({ original, title }: { original: string; title: string }) {
  const [code, setCode] = useState(original);
  const html = isHtml(original);

  // Reset editor when concept changes
  useEffect(() => {
    setCode(original);
  }, [original]);

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
                onChange={(e) => setCode(e.target.value)}
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
            onChange={(e) => setCode(e.target.value)}
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

export default function LearnPage() {
  const conceptsQuery = useListLearnConcepts({ query: { queryKey: getListLearnConceptsQueryKey() } });
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const concepts = conceptsQuery.data ?? [];
  const filtered = useMemo(
    () =>
      concepts.filter((concept) =>
        `${concept.title} ${concept.summary}`.toLowerCase().includes(search.toLowerCase())
      ),
    [concepts, search]
  );
  const active = concepts.find((concept) => concept.id === selected) ?? filtered[0];

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
              {/* ── Sidebar list ── */}
              <div className="space-y-2.5 lg:max-h-[calc(100vh-160px)] lg:overflow-y-auto lg:pr-1">
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

              {/* ── Detail panel ── */}
              {active && (
                <article className="card-lift overflow-hidden p-0" data-testid={`article-concept-${active.id}`}>
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
                  <div className="px-7 pb-7">
                    <LiveIde key={active.id} original={active.codeExample} title={active.title} />
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
