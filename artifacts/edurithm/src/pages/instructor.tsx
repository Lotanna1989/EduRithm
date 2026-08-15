import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Check, CheckSquare2, ChevronDown, GraduationCap, Loader2, LockKeyhole, RefreshCw, Search, Unlink, X } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetInstructorSessionQueryKey, getGetInstructorSubmissionQueryKey,
  getGetInstructorSummaryQueryKey, getListInstructorSubmissionsQueryKey,
  useGetInstructorSession, useGetInstructorSubmission, useGetInstructorSummary,
  useImportClassroomSubmissions, useInstructorLogin, useInstructorLogout,
  useListClassroomCourses, useListClassroomCoursework, useListClassroomSubmissions,
  useListInstructorSubmissions, useGetGoogleAuthStatus, getGetGoogleAuthStatusQueryKey,
  useDisconnectGoogle,
} from '@workspace/api-client-react';
import type { ClassroomStudentSubmission, ListInstructorSubmissionsLevel, ListInstructorSubmissionsTrack } from '@workspace/api-client-react';
import { ErrorState, InstructorSidebar, MetricCard, PageTitle, ScoreRing, SkeletonBlock, StatusPill, formatDate } from '@/components/shared';

export function PasswordGate({ children }: { children: ReactNode }) {
  const sessionQuery = useGetInstructorSession({ query: { queryKey: getGetInstructorSessionQueryKey() } });
  const login = useInstructorLogin();
  const [password, setPassword] = useState('');
  const submit = () => { if (password.trim()) login.mutate({ data: { password } }); };
  if (sessionQuery.isLoading) return <div className="grid min-h-[100dvh] place-items-center bg-[#162239]"><SkeletonBlock className="h-40 w-80 bg-[#263651]" /></div>;
  if (sessionQuery.data?.authenticated || login.data?.authenticated) return <>{children}</>;
  return <div className="noise grid min-h-[100dvh] place-items-center bg-[#162239] px-5 py-10"><div className="w-full max-w-[440px]"><div className="mb-8 flex items-center gap-2.5 text-[#f7f3ea]"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#d7f34b] text-[#162239]"><LockKeyhole size={18} /></span><span className="font-display text-xl font-bold">EduRithm / instructor</span></div><div className="rounded-2xl border border-[#40506a] bg-[#1e2d45] p-7 shadow-2xl sm:p-9"><p className="eyebrow text-[#aeb9c9]">A private view</p><h1 className="mt-2 font-display text-3xl font-bold text-[#f7f3ea]">Welcome back.</h1><p className="mt-3 text-sm leading-relaxed text-[#b6c2d1]">Your class pulse is behind this door. Enter the shared instructor password to continue.</p><label className="mt-7 block text-xs font-bold uppercase tracking-[.12em] text-[#aeb9c9]" htmlFor="instructor-password">Password</label><input id="instructor-password" type="password" className="mt-2 w-full rounded-lg border border-[#40506a] bg-[#162239] px-3 py-3 text-[#f7f3ea] outline-none transition focus:border-[#d7f34b] focus:ring-2 focus:ring-[#d7f34b]/20" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} data-testid="input-instructor-password" /><button className="btn-primary mt-5 w-full" onClick={submit} disabled={login.isPending} data-testid="button-instructor-login">{login.isPending ? 'Checking…' : 'Open class pulse'}<ArrowRight size={16} /></button>{login.isError && <p className="mt-4 rounded-lg bg-[#f9ddd5] p-3 text-sm font-bold text-[#9d3f2b]" data-testid="status-login-error">That password didn’t open the door. Try again.</p>}</div><p className="mt-5 text-center text-xs text-[#8e9bae]"><Link href="/" className="underline underline-offset-4 hover:text-[#f7f3ea]" data-testid="link-student-view">Return to student view</Link></p></div></div>;
}

export function InstructorLayout({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const logout = useInstructorLogout();
  return <div className="flex min-h-[100dvh] flex-col bg-[#f7f3ea] md:flex-row"><InstructorSidebar onLogout={() => logout.mutate(undefined, { onSuccess: () => setLocation('/instructor') })} /><main className="min-w-0 flex-1 px-5 py-8 lg:px-10 lg:py-10">{children}</main></div>;
}

// ─── Google Classroom panel ──────────────────────────────────────────────────

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

function ClassroomPanel() {
  const qc = useQueryClient();
  const [, setLocation] = useLocation();

  // Read one-shot URL flag set by the OAuth callback redirect
  const [flashMsg, setFlashMsg] = useState<'connected' | 'error' | null>(() => {
    const p = new URLSearchParams(window.location.search).get('classroom');
    return p === 'connected' || p === 'error' ? p : null;
  });

  // Strip the query param from the URL so it doesn't persist on refresh
  useEffect(() => {
    if (flashMsg) {
      const clean = window.location.pathname;
      window.history.replaceState(null, '', clean);
    }
  }, [flashMsg]);

  const authQuery = useGetGoogleAuthStatus({ query: { queryKey: getGetGoogleAuthStatusQueryKey() } });
  const connected = authQuery.data?.connected ?? false;

  const disconnect = useDisconnectGoogle({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetGoogleAuthStatusQueryKey() });
        setFlashMsg(null);
      },
    },
  });

  // Picker state
  const [courseId, setCourseId] = useState('');
  const [courseworkId, setCourseworkId] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importResults, setImportResults] = useState<any[] | null>(null);

  const coursesQuery = useListClassroomCourses({
    query: { enabled: connected, queryKey: ['classroom-courses'] },
  });
  const courseworkQuery = useListClassroomCoursework(courseId, {
    query: { enabled: connected && !!courseId, queryKey: ['classroom-coursework', courseId] },
  });
  const subsQuery = useListClassroomSubmissions(courseId, courseworkId, {
    query: {
      enabled: connected && !!courseId && !!courseworkId,
      queryKey: ['classroom-subs', courseId, courseworkId],
    },
  });

  const importMutation = useImportClassroomSubmissions({
    mutation: {
      onSuccess: (data) => {
        setImportResults(data as any[]);
        setSelected(new Set());
        // Refresh the main submissions table
        qc.invalidateQueries({ queryKey: getListInstructorSubmissionsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetInstructorSummaryQueryKey() });
      },
    },
  });

  const subs: ClassroomStudentSubmission[] = subsQuery.data ?? [];
  const hasHtml = subs.filter((s) => s.hasHtmlAttachment);
  const allSelected = hasHtml.length > 0 && hasHtml.every((s) => selected.has(s.id));

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(hasHtml.map((s) => s.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function doImport() {
    const cw = courseworkQuery.data?.find((c) => c.id === courseworkId);
    importMutation.mutate({
      data: {
        courseId,
        courseworkId,
        courseworkTitle: cw?.title ?? 'Classroom assignment',
        submissionIds: [...selected],
      },
    });
  }

  const [open, setOpen] = useState(false);

  return (
    <section className="mt-10">
      {/* Section header / toggle */}
      <button
        className="flex w-full items-center justify-between gap-3 text-left"
        onClick={() => setOpen((v) => !v)}
        data-testid="button-classroom-toggle"
      >
        <div>
          <p className="eyebrow">Google Classroom</p>
          <h2 className="mt-1 font-display text-2xl font-bold text-[#162239]">
            Import from Classroom
            {connected && authQuery.data?.email && (
              <span className="ml-3 font-sans text-sm font-normal text-[#687386]">
                · {authQuery.data.email}
              </span>
            )}
          </h2>
        </div>
        <ChevronDown
          size={20}
          className={`shrink-0 text-[#687386] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Flash messages from OAuth redirect */}
      {flashMsg === 'connected' && (
        <div className="mt-4 flex items-center gap-2.5 rounded-lg bg-[#edf4c9] px-4 py-3 text-sm font-bold text-[#3d5718]">
          <Check size={15} /> Connected to Google Classroom
          <button className="ml-auto text-xs font-normal text-[#687386]" onClick={() => setFlashMsg(null)}>Dismiss</button>
        </div>
      )}
      {flashMsg === 'error' && (
        <div className="mt-4 flex items-center gap-2.5 rounded-lg bg-[#f9ddd5] px-4 py-3 text-sm font-bold text-[#9d3f2b]">
          <AlertTriangle size={15} /> Google sign-in failed. Check your redirect URI in Google Cloud Console and try again.
          <button className="ml-auto text-xs font-normal text-[#687386]" onClick={() => setFlashMsg(null)}>Dismiss</button>
        </div>
      )}

      {open && (
        <div className="mt-5">
          {authQuery.isLoading ? (
            <SkeletonBlock className="h-24" />
          ) : !connected ? (
            /* Not connected */
            <div className="card-lift flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#e8f0fe] text-[#4285f4]">
                <GraduationCap size={26} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-[#162239]">Connect Google Classroom</p>
                <p className="mt-1 text-sm text-[#687386]">
                  Sign in with your Google account to browse your courses, pick an assignment,
                  and import submitted .html files directly into the grading pipeline.
                </p>
              </div>
              <a
                href={`${BASE}/api/auth/google`}
                className="btn-dark shrink-0"
                data-testid="link-connect-google"
              >
                <GraduationCap size={15} /> Connect Classroom
              </a>
            </div>
          ) : (
            /* Connected — pickers + submissions */
            <div className="space-y-5">
              {/* Pickers row */}
              <div className="card-lift p-5">
                <div className="flex flex-wrap items-end gap-3">
                  {/* Course picker */}
                  <div className="flex-1 min-w-[180px]">
                    <label className="block text-xs font-bold uppercase tracking-[.08em] text-[#687386] mb-1.5">Course</label>
                    <select
                      className="field"
                      value={courseId}
                      onChange={(e) => { setCourseId(e.target.value); setCourseworkId(''); setSelected(new Set()); setImportResults(null); }}
                      data-testid="select-classroom-course"
                    >
                      <option value="">
                        {coursesQuery.isLoading ? 'Loading courses…' : 'Choose a course'}
                      </option>
                      {(coursesQuery.data ?? []).map((c) => (
                        <option key={c.id} value={c.id}>{c.name}{c.section ? ` — ${c.section}` : ''}</option>
                      ))}
                    </select>
                  </div>

                  {/* Coursework picker */}
                  <div className="flex-1 min-w-[180px]">
                    <label className="block text-xs font-bold uppercase tracking-[.08em] text-[#687386] mb-1.5">Assignment</label>
                    <select
                      className="field"
                      value={courseworkId}
                      disabled={!courseId}
                      onChange={(e) => { setCourseworkId(e.target.value); setSelected(new Set()); setImportResults(null); }}
                      data-testid="select-classroom-coursework"
                    >
                      <option value="">
                        {courseworkQuery.isLoading ? 'Loading…' : courseId ? 'Choose an assignment' : 'Select a course first'}
                      </option>
                      {(courseworkQuery.data ?? []).map((cw) => (
                        <option key={cw.id} value={cw.id}>{cw.title}</option>
                      ))}
                    </select>
                  </div>

                  {/* Disconnect */}
                  <button
                    className="btn-quiet text-xs text-[#9d3f2b] hover:bg-[#f9ddd5]"
                    onClick={() => disconnect.mutate(undefined)}
                    data-testid="button-disconnect-google"
                  >
                    <Unlink size={13} /> Disconnect
                  </button>
                </div>
              </div>

              {/* Submissions table */}
              {courseworkId && (
                <div className="card-lift overflow-hidden">
                  {subsQuery.isLoading ? (
                    <div className="p-6 space-y-2"><SkeletonBlock className="h-10" /><SkeletonBlock className="h-10" /><SkeletonBlock className="h-10" /></div>
                  ) : subsQuery.isError ? (
                    <div className="p-5"><ErrorState message="Could not load student submissions." onRetry={() => subsQuery.refetch()} /></div>
                  ) : subs.length === 0 ? (
                    <p className="p-6 text-sm text-[#687386]">No student submissions found for this assignment.</p>
                  ) : (
                    <>
                      <div className="mobile-scroll">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-[#ece7dc] text-xs uppercase tracking-[.08em] text-[#687386]">
                            <tr>
                              <th className="px-4 py-3 font-bold">
                                <button onClick={toggleAll} className="flex items-center gap-2" data-testid="button-select-all-classroom">
                                  <CheckSquare2 size={14} className={allSelected ? 'text-[#536c1c]' : 'text-[#a0a7af]'} />
                                  All
                                </button>
                              </th>
                              <th className="px-4 py-3 font-bold">Student</th>
                              <th className="px-4 py-3 font-bold">Status</th>
                              <th className="px-4 py-3 font-bold">HTML file</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#e6e1d7]">
                            {subs.map((sub) => (
                              <tr
                                key={sub.id}
                                className={`transition-colors ${sub.hasHtmlAttachment ? 'cursor-pointer hover:bg-[#f0f4d9]' : 'opacity-50'}`}
                                onClick={() => sub.hasHtmlAttachment && toggleOne(sub.id)}
                                data-testid={`row-classroom-sub-${sub.id}`}
                              >
                                <td className="px-4 py-3">
                                  {sub.hasHtmlAttachment && (
                                    <div className={`h-4 w-4 rounded border-2 transition-colors ${selected.has(sub.id) ? 'border-[#536c1c] bg-[#536c1c]' : 'border-[#c7ccd2]'}`}>
                                      {selected.has(sub.id) && <Check size={10} className="text-white m-auto mt-0.5" />}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3 font-bold text-[#162239]">{sub.studentName}</td>
                                <td className="px-4 py-3">
                                  <span className={`rounded-full px-2 py-0.5 text-[.68rem] font-bold ${
                                    sub.state === 'TURNED_IN' ? 'bg-[#edf4c9] text-[#3d5718]' :
                                    sub.state === 'RETURNED' ? 'bg-[#e8f0fe] text-[#1a3a8c]' :
                                    'bg-[#ece7dc] text-[#687386]'
                                  }`}>
                                    {sub.state.replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-[#536078]">
                                  {sub.attachmentFileName ?? <span className="italic text-[#9da88b]">No HTML file</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Import bar */}
                      <div className="flex items-center justify-between gap-4 border-t border-[#e6e1d7] bg-[#f7f3ea] px-5 py-3">
                        <p className="text-xs text-[#687386]">
                          {selected.size > 0
                            ? `${selected.size} file${selected.size !== 1 ? 's' : ''} selected`
                            : `${hasHtml.length} student${hasHtml.length !== 1 ? 's' : ''} with HTML files`}
                        </p>
                        <button
                          className="btn-dark"
                          disabled={selected.size === 0 || importMutation.isPending}
                          onClick={doImport}
                          data-testid="button-import-grade"
                        >
                          {importMutation.isPending
                            ? <><Loader2 size={14} className="animate-spin" /> Grading…</>
                            : <><GraduationCap size={14} /> Import &amp; grade {selected.size > 0 ? `(${selected.size})` : ''}</>}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Import results */}
              {importResults && importResults.length > 0 && (
                <div className="card-lift overflow-hidden" data-testid="section-import-results">
                  <div className="flex items-center gap-2 border-b border-[#e6e1d7] bg-[#edf4c9] px-5 py-3">
                    <Check size={14} className="text-[#3d5718]" />
                    <p className="text-xs font-bold text-[#3d5718]">
                      {importResults.length} submission{importResults.length !== 1 ? 's' : ''} graded and added to the dashboard
                    </p>
                  </div>
                  <div className="divide-y divide-[#e6e1d7]">
                    {importResults.map((r: any) => (
                      <div key={r.id} className="flex items-center gap-4 px-5 py-3">
                        <span className="font-display text-xl font-bold text-[#162239] w-12 shrink-0">{r.score}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-[#162239] truncate">{r.studentName}</p>
                          <p className="font-mono text-[.68rem] text-[#7b8491] truncate">{r.fileName}</p>
                        </div>
                        <StatusPill status={r.status} flagged={r.flagged} />
                        <Link href={`/fix/${r.id}`} className="btn-quiet text-xs shrink-0">Open →</Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importMutation.isError && (
                <p className="rounded-lg bg-[#f9ddd5] px-4 py-3 text-sm font-bold text-[#9d3f2b]" data-testid="status-import-error">
                  Import failed. Check that you have drive.readonly scope and try reconnecting.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default function InstructorPage() {
  return <InstructorDashboard />;
}

function InstructorDashboard() {
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [level, setLevel] = useState<'' | ListInstructorSubmissionsLevel>('');
  const [track, setTrack] = useState<'' | ListInstructorSubmissionsTrack>('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const params = useMemo(() => ({ ...(flaggedOnly ? { flaggedOnly: true } : {}), ...(level ? { level } : {}), ...(track ? { track } : {}) }), [flaggedOnly, level, track]);
  const summaryQuery = useGetInstructorSummary({ query: { queryKey: getGetInstructorSummaryQueryKey() } });
  const rowsQuery = useListInstructorSubmissions(params, { query: { queryKey: getListInstructorSubmissionsQueryKey(params) } });
  const detailQuery = useGetInstructorSubmission(selectedId ?? '', { query: { queryKey: getGetInstructorSubmissionQueryKey(selectedId ?? ''), enabled: !!selectedId } });
  const summary = summaryQuery.data;
  const rows = (rowsQuery.data ?? []).filter((row) => `${row.studentName} ${row.studentId}`.toLowerCase().includes(search.toLowerCase()));
  return <PasswordGate><InstructorLayout><PageTitle eyebrow="Class pulse / today" title="Good morning, Dr. Chen." detail="A calm read on where your students are finding their footing."><Link href="/instructor/upload" className="btn-dark" data-testid="link-batch-upload">Batch upload <ArrowRight size={16} /></Link></PageTitle>
<div className="mt-9 grid gap-4 sm:grid-cols-3">{summaryQuery.isLoading ? <><SkeletonBlock className="h-32" /><SkeletonBlock className="h-32" /><SkeletonBlock className="h-32" /></> : summary ? <><MetricCard label="Submissions" value={summary.totalSubmissions} detail="all time" accent="ink" /><MetricCard label="Average score" value={summary.averageScore} detail="across reviewed work" accent="lime" /><MetricCard label="Needs a look" value={summary.flaggedSubmissions} detail="students asking for a nudge" accent="coral" /></> : <div className="sm:col-span-3"><ErrorState message="Summary metrics took a wrong turn." onRetry={() => summaryQuery.refetch()} /></div>}</div><section className="mt-10"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="eyebrow">The workbench</p><h2 className="mt-1 font-display text-2xl font-bold text-[#162239]">Recent submissions</h2></div><div className="flex flex-wrap gap-2"><button className={`btn-quiet min-h-9 px-3 text-xs ${flaggedOnly ? 'bg-[#f9ddd5] text-[#9d3f2b]' : ''}`} onClick={() => setFlaggedOnly(!flaggedOnly)} data-testid="button-filter-flagged">{flaggedOnly ? 'Showing flagged' : 'Flagged only'}</button><button className="btn-quiet min-h-9 px-3 text-xs" onClick={() => rowsQuery.refetch()} data-testid="button-refresh-submissions"><RefreshCw size={14} /> Refresh</button></div></div><div className="mt-5 flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search size={16} className="absolute left-3 top-3 text-[#7b8491]" /><input className="field pl-9" placeholder="Search student name or ID" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search-submissions" /></div><select className="field sm:w-40" value={level} onChange={(e) => setLevel(e.target.value as '' | ListInstructorSubmissionsLevel)} data-testid="select-filter-level"><option value="">All levels</option><option value="100L">100L</option><option value="300L">300L</option><option value="500L">500L</option></select><select className="field sm:w-64" value={track} onChange={(e) => setTrack(e.target.value as '' | ListInstructorSubmissionsTrack)} data-testid="select-filter-track"><option value="">All tracks</option><option value="Digital Literacy">Digital Literacy</option><option value="Web and Software Engineering">Web + Software Engineering</option></select></div><div className="card-lift mt-4 overflow-hidden"><div className="mobile-scroll"><table className="w-full text-left text-sm"><thead className="bg-[#ece7dc] text-xs uppercase tracking-[.08em] text-[#687386]"><tr><th className="px-5 py-3 font-bold">Student</th><th className="px-4 py-3 font-bold">Level</th><th className="px-4 py-3 font-bold">Score</th><th className="px-4 py-3 font-bold">Review</th><th className="px-5 py-3 text-right font-bold">Submitted</th></tr></thead><tbody className="divide-y divide-[#e6e1d7]">{rowsQuery.isLoading ? Array.from({ length: 4 }).map((_, index) => <tr key={index}><td colSpan={5} className="px-5 py-4"><SkeletonBlock className="h-5 w-full" /></td></tr>) : rowsQuery.isError ? <tr><td colSpan={5} className="p-5"><ErrorState message="Submissions could not be loaded." onRetry={() => rowsQuery.refetch()} /></td></tr> : rows.length === 0 ? <tr><td colSpan={5} className="p-10 text-center text-sm text-[#687386]" data-testid="state-empty-submissions">No submissions match these filters.</td></tr> : rows.map((row) => <tr key={row.id} className="cursor-pointer transition-colors hover:bg-[#f0f4d9]" onClick={() => setSelectedId(row.id)} data-testid={`row-submission-${row.id}`}><td className="px-5 py-4"><div className="font-bold text-[#162239]">{row.studentName}</div><div className="mt-0.5 font-mono text-[.68rem] text-[#7b8491]">{row.studentId}</div></td><td className="px-4 py-4"><span className="rounded bg-[#ece7dc] px-2 py-1 font-mono text-xs font-bold text-[#536078]">{row.level}</span></td><td className="px-4 py-4 font-display text-xl font-bold text-[#162239]">{row.score ?? '—'}</td><td className="px-4 py-4"><StatusPill status={row.status} flagged={row.flagged} /></td><td className="px-5 py-4 text-right text-xs text-[#7b8491]">{formatDate(row.createdAt)}</td></tr>)}</tbody></table></div></div></section>{selectedId && <div className="fixed inset-0 z-30 flex items-end justify-center bg-[#162239]/35 p-0 sm:items-center sm:p-5" onClick={() => setSelectedId(null)}><div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-[#f7f3ea] p-6 shadow-2xl sm:rounded-2xl sm:p-8" onClick={(e) => e.stopPropagation()}><div className="flex items-start justify-between"><div><p className="eyebrow">Submission detail</p><h2 className="mt-1 font-display text-2xl font-bold">{detailQuery.data?.studentName ?? 'Loading detail…'}</h2></div><button className="btn-quiet min-h-9 px-2.5" onClick={() => setSelectedId(null)} data-testid="button-close-detail"><X size={17} /></button></div>{detailQuery.isLoading ? <div className="mt-7 space-y-3"><SkeletonBlock className="h-16" /><SkeletonBlock className="h-32" /></div> : detailQuery.data && <><div className="mt-6 flex items-center gap-5 rounded-xl bg-[#edf4c9] p-4"><ScoreRing score={detailQuery.data.score} size="md" /><div><StatusPill status={detailQuery.data.status} flagged={detailQuery.data.flagged} /><p className="mt-2 text-sm text-[#536078]">{detailQuery.data.assignment.prompt}</p></div></div><h3 className="mt-7 font-display text-lg font-bold">Reviewer notes</h3><p className="mt-2 text-sm leading-relaxed text-[#536078]">{detailQuery.data.explanation || 'No explanation available.'}</p><div className="mt-4 space-y-2">{detailQuery.data.issuesFound.map((issue, index) => <div key={index} className="rounded-lg bg-[#f9e4dd] px-3 py-2 text-sm text-[#774437]">{issue}</div>)}</div><Link href={`/fix/${detailQuery.data.id}`} className="btn-dark mt-6" onClick={() => setSelectedId(null)} data-testid="link-open-fix-detail">Open student workspace <ArrowRight size={16} /></Link></>}</div></div>}<ClassroomPanel /></InstructorLayout></PasswordGate>;
}