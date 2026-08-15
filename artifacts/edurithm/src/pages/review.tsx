import { useRef, useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, Code2, FileCode2, Loader2, Sparkles, UploadCloud, XCircle } from 'lucide-react';
import { useReviewHtml } from '@workspace/api-client-react';
import type { ReviewResult } from '@workspace/api-client-react';
import { StudentNav, ScoreRing, FileDrop } from '@/components/shared';

export default function ReviewPage() {
  const [file, setFile] = useState<File | null>(null);
  const [code, setCode] = useState('');
  const [result, setResult] = useState<ReviewResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const review = useReviewHtml();

  const onFile = (f: File) => {
    setFile(f);
    setResult(null);
    review.reset();
    f.text().then(setCode);
  };

  const submit = () => {
    if (!file || !code) return;
    review.mutate(
      { data: { fileName: file.name, codeContent: code } },
      {
        onSuccess: (data) => {
          setResult(data);
          setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
        },
      }
    );
  };

  const reset = () => {
    setFile(null);
    setCode('');
    setResult(null);
    review.reset();
  };

  const canSubmit = !!file && !!code && !review.isPending && !result;

  return (
    <div className="noise app-shell bg-[#f7f3ea]">
      <StudentNav />

      <main className="mx-auto max-w-[820px] px-5 pb-24 pt-10 lg:px-8 lg:pt-14">

        {/* Header */}
        <div className="fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#b5c66d] bg-[#edf4c9] px-3 py-1.5 text-xs font-bold text-[#536c1c]">
            <Sparkles size={13} /> Open review — no assignment needed
          </span>
          <h1 className="mt-5 font-display text-5xl font-bold leading-[.97] tracking-[-.04em] text-[#162239] sm:text-6xl">
            Drop any HTML file.<br />
            <span className="text-[#536c1c]">Get honest feedback.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-[#687386]">
            Upload any <code className="rounded bg-[#e6e1d7] px-1.5 py-0.5 font-mono text-sm">.html</code> file
            — coursework, practice, or a personal project — and Gemini will review the code quality,
            flag issues, and highlight what's working well.
          </p>
        </div>

        {/* Upload card */}
        <div className="fade-up card-lift mt-10 p-6 sm:p-8">
          <p className="eyebrow">01 / choose a file</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-[#162239]">Your HTML file</h2>
          <p className="mt-2 text-sm text-[#687386]">Any .html file works — with CSS and JavaScript inside or linked.</p>
          <div className="mt-5">
            <FileDrop fileName={file?.name ?? ''} onFile={onFile} />
          </div>

          {file && (
            <div className="mt-4 flex items-center gap-2.5 rounded-lg bg-[#f0f4d9] px-4 py-3">
              <FileCode2 size={15} className="shrink-0 text-[#536c1c]" />
              <span className="font-mono text-xs font-bold text-[#263550]">{file.name}</span>
              <span className="ml-auto text-xs text-[#9da88b]">
                {Math.round(file.size / 1024) || '<1'} KB · ready to review
              </span>
            </div>
          )}

          <div className="mt-6 flex flex-col justify-between gap-4 border-t border-[#e1ddd4] pt-5 sm:flex-row sm:items-center">
            <p className="text-xs leading-relaxed text-[#78817d]">
              Gemini evaluates structure, semantics, CSS layout, and JavaScript if present.
            </p>
            <div className="flex gap-2">
              {result && (
                <button className="btn-quiet" onClick={reset} data-testid="button-review-reset">
                  Review another file
                </button>
              )}
              <button
                className="btn-dark"
                disabled={!canSubmit}
                onClick={submit}
                data-testid="button-submit-review"
              >
                {review.isPending ? (
                  <><Loader2 size={15} className="animate-spin" /> Reviewing…</>
                ) : (
                  <><Sparkles size={15} /> Review my code</>
                )}
              </button>
            </div>
          </div>

          {review.isError && (
            <p className="mt-4 rounded-lg bg-[#f9ddd5] p-3 text-sm font-bold text-[#9d3f2b]" data-testid="status-review-error">
              The review couldn't complete. Check your file is valid HTML and try again.
            </p>
          )}
        </div>

        {/* Results */}
        {result && (
          <div ref={resultRef} className="fade-up mt-8" data-testid="section-review-result">

            {/* Score + verdict */}
            <div className="rounded-2xl bg-[#162239] p-6 text-[#f7f3ea] shadow-[0_18px_60px_rgba(22,34,57,.16)] sm:p-8">
              <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
                <div>
                  <p className="eyebrow text-[#aeb9c9]">02 / review results</p>
                  <h2 className="mt-2 font-display text-3xl font-bold">
                    {result.score >= 80
                      ? 'Strong work.'
                      : result.score >= 50
                      ? 'Good start.'
                      : 'Needs some work.'}
                  </h2>
                  <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#b6c2d1]">
                    {result.explanation}
                  </p>
                </div>
                <ScoreRing score={result.score} size="lg" />
              </div>

              <div className="mt-5 flex items-center gap-2 border-t border-[#40506a] pt-5">
                {result.meetsBaseline ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e4f0bc] px-3 py-1.5 text-xs font-bold text-[#47611c]">
                    <CheckCircle2 size={13} /> Working baseline
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f9ddd5] px-3 py-1.5 text-xs font-bold text-[#9d3f2b]">
                    <XCircle size={13} /> Needs foundational fixes
                  </span>
                )}
                <span className="text-xs text-[#7b8491]">for {file?.name}</span>
              </div>
            </div>

            {/* Highlights + Issues */}
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {/* What's working */}
              {result.highlights.length > 0 && (
                <div className="card-lift p-5 bg-[#edf4c9]">
                  <p className="eyebrow text-[#536c1c]">What's working</p>
                  <ul className="mt-4 space-y-2">
                    {result.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-[#2e3a1f]">
                        <Check size={14} className="mt-0.5 shrink-0 text-[#7a981d]" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Issues */}
              {result.issuesFound.length > 0 && (
                <div className="card-lift p-5 bg-[#f9ddd5]">
                  <p className="eyebrow text-[#7a3a27]">Issues to fix</p>
                  <ul className="mt-4 space-y-2">
                    {result.issuesFound.map((issue, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-[#4a1e12]">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[#c0402b]" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.highlights.length === 0 && result.issuesFound.length === 0 && (
                <div className="card-lift p-5 sm:col-span-2">
                  <p className="text-sm text-[#687386]">No specific issues or highlights — see the explanation above.</p>
                </div>
              )}
            </div>

            {/* Corrected snippet */}
            {result.correctedSnippet && (
              <div className="mt-5 card-lift overflow-hidden">
                <div className="flex items-center gap-2.5 border-b border-[#e6e1d7] bg-[#f0ecdf] px-5 py-3">
                  <Code2 size={14} className="text-[#687386]" />
                  <p className="text-xs font-bold text-[#263550]">Suggested fix</p>
                </div>
                <pre className="code-area overflow-x-auto p-5 text-sm leading-relaxed" data-testid="display-corrected-snippet">
                  <code>{result.correctedSnippet}</code>
                </pre>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
