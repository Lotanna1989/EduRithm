import { useMemo, useState } from 'react';
import { BookOpen, Check, Code2, ExternalLink, Loader2, Search, Sparkles } from 'lucide-react';
import { Link } from 'wouter';
import { useListLearnConcepts, getListLearnConceptsQueryKey, useJoinWaitlist } from '@workspace/api-client-react';
import { ErrorState, PageTitle, SkeletonBlock, StudentNav, EmptyState } from '@/components/shared';

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

          {/* Expansion areas */}
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

          {/* Divider */}
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

              {/* Name + Email */}
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

              {/* Interests */}
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

              {/* Error */}
              {join.isError && (
                <p className="mt-3 text-sm text-[#ef775b]" data-testid="status-waitlist-error">
                  Something went wrong. Please try again.
                </p>
              )}

              {/* Submit */}
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
      <main className="mx-auto max-w-[1240px] px-5 pb-20 pt-10 lg:px-8 lg:pt-14">
        <PageTitle
          eyebrow="The quiet corner"
          title="Learn in layers."
          detail="Concepts, examples, and the language to make feedback feel useful. Start anywhere. Come back often."
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

        {/* IDE callout */}
        <Link
          to="/review"
          className="mt-8 flex items-center gap-4 rounded-2xl border border-[#9ebc28]/40 bg-[#edf4c9] px-5 py-4 transition hover:border-[#9ebc28] hover:bg-[#e4efb8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#9ebc28]"
          data-testid="banner-ide"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#162239] text-[#d7f34b]">
            <Code2 size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-[#162239]">Try the code yourself — there's a live editor</p>
            <p className="text-sm text-[#536078]">
              Paste any HTML into the EduRithm code playground and get instant AI feedback on what you wrote.
            </p>
          </div>
          <ExternalLink size={16} className="shrink-0 text-[#8da923]" />
        </Link>

        <div className="mt-10 grid gap-6 lg:grid-cols-[.75fr_1.25fr]">
          {conceptsQuery.isLoading ? (
            <>
              <div className="space-y-3">
                <SkeletonBlock className="h-24" />
                <SkeletonBlock className="h-24" />
                <SkeletonBlock className="h-24" />
              </div>
              <SkeletonBlock className="h-[500px]" />
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
              {/* Sidebar list */}
              <div className="space-y-3">
                {filtered.map((concept, index) => (
                  <button
                    key={concept.id}
                    className={`focus-ring card-lift flex w-full items-start gap-4 p-5 text-left ${active?.id === concept.id ? 'border-[#9ebc28] bg-[#edf4c9]' : ''}`}
                    onClick={() => setSelected(concept.id)}
                    data-testid={`button-concept-${concept.id}`}
                  >
                    <span className="font-mono text-xs font-bold text-[#8da923]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span>
                      <span className="block font-display text-lg font-bold text-[#162239]">{concept.title}</span>
                      <span className="mt-1 block text-sm leading-relaxed text-[#687386]">{concept.summary}</span>
                    </span>
                  </button>
                ))}
              </div>

              {/* Detail panel */}
              {active && (
                <article className="card-lift p-6 sm:p-9" data-testid={`article-concept-${active.id}`}>
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#162239] px-3 py-1.5 text-xs font-bold text-[#d7f34b]">
                        <BookOpen size={13} /> concept note
                      </div>
                      <h2 className="font-display text-3xl font-bold tracking-tight text-[#162239] sm:text-4xl">
                        {active.title}
                      </h2>
                    </div>
                    {active.youtubeUrl && (
                      <a
                        href={active.youtubeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-outline min-h-9 px-3 text-xs"
                        data-testid="link-concept-video"
                      >
                        <ExternalLink size={14} /> Watch example
                      </a>
                    )}
                  </div>
                  <p className="mt-6 text-lg leading-relaxed text-[#536078]">{active.explanation}</p>
                  <div className="mt-7 overflow-hidden rounded-xl bg-[#162239]">
                    <div className="flex items-center gap-2 border-b border-[#40506a] px-4 py-3">
                      <span className="h-2 w-2 rounded-full bg-[#ef775b]" />
                      <span className="h-2 w-2 rounded-full bg-[#d7f34b]" />
                      <span className="h-2 w-2 rounded-full bg-[#9da9b8]" />
                      <span className="ml-2 font-mono text-[.65rem] text-[#aeb9c9]">
                        {active.title.toLowerCase().includes('python') ||
                         active.title.toLowerCase().includes('variable') ||
                         active.title.toLowerCase().includes('print') ||
                         active.title.toLowerCase().includes('loop') ||
                         active.title.toLowerCase().includes('if')
                          ? 'example.py'
                          : 'example.html'}
                      </span>
                    </div>
                    <pre
                      className="overflow-x-auto p-5 font-mono text-xs leading-6 text-[#dce6d7]"
                      data-testid="text-concept-code"
                    >
                      <code>{active.codeExample}</code>
                    </pre>
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
