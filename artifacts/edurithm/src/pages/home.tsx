import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, RefreshCw, Sparkles } from 'lucide-react';
import { Link } from 'wouter';
import { useCreateSubmission, useGetRandomAssignment, getGetRandomAssignmentQueryKey, useHealthCheck, getHealthCheckQueryKey } from '@workspace/api-client-react';
import type { Submission, SubmissionInputLevel, SubmissionInputTrack } from '@workspace/api-client-react';
import { FileDrop, StudentNav, ErrorState, ScoreRing, SkeletonBlock, StatusPill } from '@/components/shared';

const levels: { value: SubmissionInputLevel; label: string; detail: string }[] = [
  { value: '100L', label: '100L · Foundations', detail: 'Build confidence with the essentials.' },
  { value: '300L', label: '300L · Applied', detail: 'Put concepts together in real work.' },
  { value: '500L', label: '500L · Advanced', detail: 'Stretch your thinking and your code.' },
];
const tracks: { value: SubmissionInputTrack; label: string; detail: string }[] = [
  { value: 'Digital Literacy', label: 'Digital Literacy', detail: 'Practical web fluency.' },
  { value: 'Web and Software Engineering', label: 'Web + Software Engineering', detail: 'Build, debug, ship.' },
];

export default function Home() {
  const [level, setLevel] = useState<SubmissionInputLevel>('100L');
  const [track, setTrack] = useState<SubmissionInputTrack>('Digital Literacy');
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [code, setCode] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<Submission | null>(null);
  const assignmentQuery = useGetRandomAssignment({ level, track }, { query: { queryKey: getGetRandomAssignmentQueryKey({ level, track }) } });
  const createSubmission = useCreateSubmission();
  const healthQuery = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), staleTime: 60_000 } });
  const assignment = assignmentQuery.data;
  const canSubmit = !!assignment && !!studentName.trim() && !!studentId.trim() && !!file && !!code;

  useEffect(() => {
    if (file) file.text().then(setCode);
  }, [file]);
  const assignmentLabel = useMemo(() => assignment?.prompt ?? 'Your assignment will appear here.', [assignment]);

  const submit = () => {
    if (!assignment || !canSubmit) return;
    createSubmission.mutate({ data: { studentName: studentName.trim(), studentId: studentId.trim(), level, track, assignmentId: assignment.id, fileName: file?.name ?? 'assignment.html', codeContent: code } }, {
      onSuccess: (submission) => { setSubmitted(true); setResult(submission); },
    });
  };

  return <div className="noise app-shell bg-[#f7f3ea]">
    <StudentNav />
    <main className="paper-grid mx-auto max-w-[1240px] px-5 pb-20 pt-10 lg:px-8 lg:pt-14">
      <section className="grid gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-end">
        <div className="fade-up max-w-2xl">
          <div className="mb-6 flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-2 rounded-full border border-[#b5c66d] bg-[#edf4c9] px-3 py-1.5 text-xs font-bold text-[#536c1c]"><Sparkles size={14} /> A kinder code review</span><span className="inline-flex items-center gap-1.5 rounded-full border border-[#d4d0c6] bg-[#fbf9f4] px-3 py-1.5 font-mono text-[.62rem] font-bold text-[#687386]"><span className={`h-1.5 w-1.5 rounded-full ${healthQuery.isError ? 'bg-[#d95e49]' : healthQuery.isLoading ? 'bg-[#d7a229]' : 'bg-[#8da923]'}`} /> {healthQuery.isError ? 'studio offline' : 'studio ready'}</span></div>
          <h1 className="font-display text-5xl font-bold leading-[.98] tracking-[-.04em] text-[#162239] sm:text-7xl">Make a little<br /><span className="text-[#536c1c]">progress</span> visible.</h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-[#687386]">EduRithm reads your HTML, points to the next useful change, and gives you a place to try again. No intimidating gradebook. Just a clear next step.</p>
          <div className="mt-8 flex flex-wrap items-center gap-5 text-sm font-bold text-[#536078]"><span className="inline-flex items-center gap-2"><Check size={16} className="text-[#7a981d]" /> Actionable feedback</span><span className="inline-flex items-center gap-2"><Check size={16} className="text-[#7a981d]" /> Built for your level</span></div>
        </div>
        <div className="fade-up fade-up-delay relative hidden min-h-[250px] overflow-hidden rounded-[1.5rem] bg-[#162239] p-7 shadow-[0_18px_60px_rgba(22,34,57,.18)] sm:block">
          <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full border-[24px] border-[#d7f34b] opacity-90" /><div className="absolute -bottom-12 -left-12 h-44 w-44 rounded-full border-[24px] border-[#ef775b] opacity-80" />
          <div className="relative flex h-full flex-col justify-between"><p className="eyebrow text-[#aeb9c9]">The studio loop</p><div className="font-mono text-sm leading-7 text-[#d8e0ea]"><span className="text-[#d7f34b]">01</span> submit your work<br /><span className="text-[#ef775b]">02</span> see what matters<br /><span className="text-[#d7f34b]">03</span> fix one thing at a time</div><p className="text-right font-display text-2xl font-bold text-[#f7f3ea]">keep going.</p></div>
        </div>
      </section>

      <section className="fade-up fade-up-delay-2 mt-14 grid gap-8 lg:grid-cols-[.78fr_1.22fr]">
        <div className="card-lift h-fit p-6 sm:p-8">
          <p className="eyebrow">01 / set your lane</p><h2 className="mt-2 font-display text-2xl font-bold text-[#162239]">Where are you working?</h2>
          <div className="mt-6 space-y-3">
            <label className="label">Course level</label>
            {levels.map((item) => <button key={item.value} className={`focus-ring flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all ${level === item.value ? 'border-[#9ebc28] bg-[#edf4c9]' : 'border-[#d4d0c6] bg-[#fbf9f4] hover:border-[#aeb9a1]'}`} onClick={() => setLevel(item.value)} data-testid={`button-level-${item.value}`}><span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${level === item.value ? 'border-[#829b21] bg-[#829b21] text-white' : 'border-[#aab0a4]'}`}>{level === item.value && <Check size={13} />}</span><span><span className="block text-sm font-bold">{item.label}</span><span className="mt-0.5 block text-xs text-[#78817d]">{item.detail}</span></span></button>)}
          </div>
          <div className="mt-7 space-y-3"><label className="label">Learning track</label>{tracks.map((item) => <button key={item.value} className={`focus-ring flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all ${track === item.value ? 'border-[#ef775b] bg-[#f9e4dd]' : 'border-[#d4d0c6] bg-[#fbf9f4] hover:border-[#aeb0a4]'}`} onClick={() => setTrack(item.value)} data-testid={`button-track-${item.value.slice(0, 3)}`}><span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${track === item.value ? 'border-[#d95e49] bg-[#d95e49] text-white' : 'border-[#aab0a4]'}`}>{track === item.value && <Check size={13} />}</span><span><span className="block text-sm font-bold">{item.label}</span><span className="mt-0.5 block text-xs text-[#78817d]">{item.detail}</span></span></button>)}</div>
        </div>
        <div className="card-lift p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">02 / today’s prompt</p><h2 className="mt-2 font-display text-2xl font-bold text-[#162239]">Your assignment</h2></div><button className="btn-quiet min-h-9 px-3 text-xs" onClick={() => assignmentQuery.refetch()} disabled={assignmentQuery.isFetching} data-testid="button-refresh-assignment"><RefreshCw size={14} className={assignmentQuery.isFetching ? 'animate-spin' : ''} /> New prompt</button></div>
          <div className="mt-5 min-h-[104px] rounded-xl bg-[#162239] p-5 text-[#f7f3ea]">{assignmentQuery.isLoading ? <><SkeletonBlock className="h-4 w-4/5 bg-[#2d3a52]" /><SkeletonBlock className="mt-3 h-4 w-3/5 bg-[#2d3a52]" /></> : assignmentQuery.isError ? <ErrorState message="The prompt is taking a break." onRetry={() => assignmentQuery.refetch()} /> : <><p className="font-mono text-xs text-[#d7f34b]">{level} / {track}</p><p className="mt-3 text-sm leading-relaxed">{assignmentLabel}</p></>}</div>
          <div className="mt-7 grid gap-5 sm:grid-cols-2"><div><label className="label" htmlFor="student-name">Your name</label><input id="student-name" className="field" placeholder="e.g. Sam Okafor" value={studentName} onChange={(e) => setStudentName(e.target.value)} data-testid="input-student-name" /></div><div><label className="label" htmlFor="student-id">Student ID</label><input id="student-id" className="field" placeholder="e.g. s204812" value={studentId} onChange={(e) => setStudentId(e.target.value)} data-testid="input-student-id" /></div></div>
          <div className="mt-5"><label className="label">Your HTML file</label><FileDrop fileName={file?.name ?? ''} onFile={setFile} /></div>
          <div className="mt-6 flex flex-col justify-between gap-4 border-t border-[#e1ddd4] pt-5 sm:flex-row sm:items-center"><p className="max-w-sm text-xs leading-relaxed text-[#78817d]">We look for structure, semantics, and the small decisions that make a page work.</p><button className="btn-dark" disabled={!canSubmit || createSubmission.isPending} onClick={submit} data-testid="button-submit-assignment">{createSubmission.isPending ? 'Reading your code…' : submitted ? 'Opening feedback…' : 'Submit for feedback'}<ArrowRight size={16} /></button></div>
          {createSubmission.isError && <p className="mt-4 rounded-lg bg-[#f9ddd5] p-3 text-sm font-bold text-[#9d3f2b]" data-testid="status-submit-error">We couldn’t grade that file. Check it is an HTML file and try again.</p>}
        </div>
      </section>
      {result && <section className="fade-up mt-8 rounded-2xl bg-[#162239] p-6 text-[#f7f3ea] shadow-[0_18px_60px_rgba(22,34,57,.16)] sm:p-8" data-testid="section-grading-result"><div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center"><div><p className="eyebrow text-[#aeb9c9]">03 / first read</p><h2 className="mt-2 font-display text-3xl font-bold">Your work has a shape.</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-[#b6c2d1]">{result.explanation || 'Your submission has been reviewed. Open the workspace to see the notes.'}</p></div><ScoreRing score={result.score} size="lg" /></div><div className="mt-7 flex flex-col justify-between gap-4 border-t border-[#40506a] pt-5 sm:flex-row sm:items-center"><div><StatusPill status={result.status} flagged={result.flagged} /><p className="mt-2 text-xs text-[#aeb9c9]">{result.flagged ? 'A follow-up workspace is ready with a focused next step.' : 'Want to see the reasoning behind your result?'}</p></div><Link href={result.fixItUrl || `/fix/${result.id}`} className="btn-primary" data-testid="link-open-grading-result">{result.flagged ? 'Open Fix It workspace' : 'See feedback details'}<ArrowRight size={16} /></Link></div></section>}
    </main>
  </div>;
}