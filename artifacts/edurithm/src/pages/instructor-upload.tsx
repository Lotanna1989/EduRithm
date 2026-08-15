import { useCallback, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, FileCode2, Loader2, Trash2, UploadCloud, X } from 'lucide-react';
import { Link } from 'wouter';
import { useCreateBatchSubmissions } from '@workspace/api-client-react';
import type { Submission, SubmissionInput } from '@workspace/api-client-react';
import { InstructorLayout, PasswordGate } from '@/pages/instructor';
import { PageTitle, ScoreRing, StatusPill, formatDate } from '@/components/shared';

// ─── Types ────────────────────────────────────────────────────────────────────

const LEVELS = ['100L', '300L', '500L'] as const;
const TRACKS = ['Digital Literacy', 'Web and Software Engineering'] as const;

type Level = (typeof LEVELS)[number];
type Track = (typeof TRACKS)[number];

interface FileMeta {
  studentName: string;
  studentId: string;
  level: Level;
  track: Track;
  assignmentId: string; // blank = auto-resolve by level+track on backend
}

interface FileEntry {
  id: string;
  file: File;
  code: string;
  meta: FileMeta;
  readError?: string;
}

// ─── Default meta ─────────────────────────────────────────────────────────────

function defaultMeta(): FileMeta {
  return { studentName: '', studentId: '', level: '100L', track: 'Digital Literacy', assignmentId: '' };
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InstructorUploadPage() {
  return (
    <PasswordGate>
      <InstructorLayout>
        <BatchUpload />
      </InstructorLayout>
    </PasswordGate>
  );
}

// ─── Batch Upload ─────────────────────────────────────────────────────────────

function BatchUpload() {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [results, setResults] = useState<Submission[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const batch = useCreateBatchSubmissions();

  // Read files into entries
  const addFiles = useCallback((files: FileList | File[]) => {
    const htmlFiles = Array.from(files).filter(
      (f) => f.name.toLowerCase().endsWith('.html') || f.name.toLowerCase().endsWith('.htm')
    );
    if (!htmlFiles.length) return;

    htmlFiles.forEach((file) => {
      const id = `${Date.now()}-${Math.random()}`;
      file
        .text()
        .then((code) => {
          setEntries((prev) => [
            ...prev,
            { id, file, code, meta: defaultMeta() },
          ]);
        })
        .catch(() => {
          setEntries((prev) => [
            ...prev,
            { id, file, code: '', meta: defaultMeta(), readError: 'Could not read file' },
          ]);
        });
    });
  }, []);

  // Drag handlers
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = ''; // reset so same file can be re-added
  };

  const removeEntry = (id: string) =>
    setEntries((prev) => prev.filter((e) => e.id !== id));

  const updateMeta = (id: string, patch: Partial<FileMeta>) =>
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, meta: { ...e.meta, ...patch } } : e))
    );

  const canSubmit =
    entries.length > 0 &&
    !batch.isPending &&
    results === null &&
    entries.every(
      (e) => !e.readError && e.meta.studentName.trim() && e.meta.studentId.trim() && e.code
    );

  const submit = () => {
    const submissions: SubmissionInput[] = entries.map((e) => ({
      studentName: e.meta.studentName.trim(),
      studentId: e.meta.studentId.trim(),
      level: e.meta.level,
      track: e.meta.track,
      assignmentId: e.meta.assignmentId.trim() || 'auto',
      fileName: e.file.name,
      codeContent: e.code,
    }));

    batch.mutate(
      { data: { submissions } },
      { onSuccess: (data) => setResults(data) }
    );
  };

  const reset = () => {
    setEntries([]);
    setResults(null);
    batch.reset();
  };

  // ── Results view ──────────────────────────────────────────────────────────

  if (results !== null) {
    const graded = results.filter((r) => r.status === 'graded').length;
    const flagged = results.filter((r) => r.flagged).length;
    const failed = results.filter((r) => r.status === 'failed').length;

    return (
      <div className="max-w-[900px]">
        <PageTitle
          eyebrow="Instructor studio / batch results"
          title="Grading complete."
          detail="Here's how the batch landed."
        >
          <div className="flex gap-2">
            <button className="btn-quiet" onClick={reset} data-testid="button-new-batch">
              <UploadCloud size={15} /> New batch
            </button>
            <Link href="/instructor" className="btn-outline" data-testid="link-back-dashboard">
              <ArrowLeft size={15} /> Class pulse
            </Link>
          </div>
        </PageTitle>

        {/* Summary strip */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="card-lift p-5 bg-[#edf4c9]">
            <p className="eyebrow text-[#69734f]">Graded</p>
            <p className="mt-3 font-display text-4xl font-bold text-[#162239]">{graded}</p>
          </div>
          <div className="card-lift p-5 bg-[#f9ddd5]">
            <p className="eyebrow text-[#7a3a27]">Flagged</p>
            <p className="mt-3 font-display text-4xl font-bold text-[#162239]">{flagged}</p>
          </div>
          <div className="card-lift p-5">
            <p className="eyebrow">Could not grade</p>
            <p className="mt-3 font-display text-4xl font-bold text-[#162239]">{failed}</p>
          </div>
        </div>

        {/* Result rows */}
        <div className="mt-8 divide-y divide-[#e6e1d7] rounded-2xl border border-[#d4d0c6] bg-white" data-testid="section-batch-results">
          {results.map((r) => (
            <div key={r.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <ScoreRing score={r.score} size="sm" />
                <div>
                  <p className="font-bold text-[#162239]">{r.studentName}</p>
                  <p className="font-mono text-[.66rem] text-[#7b8491]">
                    {r.studentId} · {r.level} · {r.fileName}
                  </p>
                  <div className="mt-1.5">
                    <StatusPill status={r.status} flagged={r.flagged} />
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                {r.explanation && (
                  <p className="max-w-xs text-right text-xs leading-relaxed text-[#687386]">
                    {r.explanation.slice(0, 100)}{r.explanation.length > 100 ? '…' : ''}
                  </p>
                )}
                {r.flagged && (
                  <Link
                    href={r.fixItUrl || `/fix/${r.id}`}
                    className="btn-quiet text-xs"
                    data-testid={`link-fix-it-${r.id}`}
                  >
                    Fix It workspace <ArrowRight size={13} />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Upload + metadata form ────────────────────────────────────────────────

  return (
    <div className="max-w-[900px]">
      <PageTitle
        eyebrow="Instructor studio / batch upload"
        title="Grade a batch."
        detail="Upload multiple .html files at once. Fill in each student's details, then send the whole batch to Gemini."
      >
        <Link href="/instructor" className="btn-outline" data-testid="link-back-dashboard">
          <ArrowLeft size={16} /> Back to pulse
        </Link>
      </PageTitle>

      {/* Drop zone */}
      <div
        className={`mt-8 rounded-2xl border-2 border-dashed transition-colors ${
          dragOver
            ? 'border-[#829b21] bg-[#edf4c9]'
            : 'border-[#9da88b] bg-[#f7f3ea] hover:border-[#829b21] hover:bg-[#f0f4d9]'
        } cursor-pointer p-10 text-center`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        data-testid="input-multi-file-drop"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".html,.htm"
          multiple
          className="sr-only"
          onChange={onInputChange}
          data-testid="input-file-picker"
        />
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#d7f34b] text-[#162239]">
          <UploadCloud size={22} />
        </span>
        <p className="mt-3 font-bold text-[#162239]">
          {entries.length > 0
            ? `${entries.length} file${entries.length > 1 ? 's' : ''} added — drop more or click to browse`
            : 'Drop .html files here, or click to browse'}
        </p>
        <p className="mt-1 text-xs text-[#69734f]">
          Multiple files supported · .html and .htm
        </p>
      </div>

      {/* Per-file forms */}
      {entries.length > 0 && (
        <div className="mt-6 space-y-4">
          {entries.map((entry, idx) => (
            <FileEntryCard
              key={entry.id}
              entry={entry}
              index={idx}
              onChange={(patch) => updateMeta(entry.id, patch)}
              onRemove={() => removeEntry(entry.id)}
              disabled={batch.isPending}
            />
          ))}
        </div>
      )}

      {/* Validation hint */}
      {entries.length > 0 && !canSubmit && !batch.isPending && (
        <p className="mt-4 text-xs text-[#7b8491]">
          Fill in student name and ID for every file to enable grading.
        </p>
      )}

      {/* Submit */}
      {entries.length > 0 && (
        <div className="mt-6 flex items-center justify-between gap-4 border-t border-[#e1ddd4] pt-6">
          <p className="text-sm text-[#687386]">
            {entries.length} file{entries.length > 1 ? 's' : ''} · each will be sent to Gemini for grading
          </p>
          <button
            className="btn-dark"
            disabled={!canSubmit}
            onClick={submit}
            data-testid="button-submit-batch"
          >
            {batch.isPending ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Grading…
              </>
            ) : (
              <>
                Grade {entries.length} submission{entries.length > 1 ? 's' : ''}
                <UploadCloud size={15} />
              </>
            )}
          </button>
        </div>
      )}

      {batch.isError && (
        <p
          className="mt-4 rounded-lg bg-[#f9ddd5] p-3 text-sm font-bold text-[#9d3f2b]"
          data-testid="status-batch-error"
        >
          The batch could not be sent. Check your connection and try again.
        </p>
      )}
    </div>
  );
}

// ─── Per-file card ─────────────────────────────────────────────────────────────

function FileEntryCard({
  entry,
  index,
  onChange,
  onRemove,
  disabled,
}: {
  entry: FileEntry;
  index: number;
  onChange: (patch: Partial<FileMeta>) => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  const { meta, file, readError } = entry;
  const isComplete = meta.studentName.trim() && meta.studentId.trim() && !readError;

  return (
    <div
      className={`card-lift overflow-hidden transition-shadow ${
        readError ? 'border border-[#f9ddd5]' : ''
      }`}
      data-testid={`card-file-entry-${index}`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 border-b border-[#e6e1d7] bg-[#f0ecdf] px-5 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${
              isComplete
                ? 'bg-[#d7f34b] text-[#162239]'
                : readError
                ? 'bg-[#f9ddd5] text-[#9d3f2b]'
                : 'bg-[#ddd9d0] text-[#687386]'
            }`}
          >
            {isComplete ? <Check size={14} /> : readError ? <X size={14} /> : index + 1}
          </span>
          <span className="flex items-center gap-1.5 min-w-0">
            <FileCode2 size={14} className="shrink-0 text-[#687386]" />
            <span className="truncate font-mono text-xs font-bold text-[#263550]">
              {file.name}
            </span>
            <span className="shrink-0 text-xs text-[#9da88b]">
              ({Math.round(file.size / 1024) || '<1'} KB)
            </span>
          </span>
        </div>
        <button
          className="focus-ring shrink-0 rounded-lg p-1.5 text-[#7b8491] transition-colors hover:bg-[#f9ddd5] hover:text-[#9d3f2b]"
          onClick={onRemove}
          disabled={disabled}
          data-testid={`button-remove-entry-${index}`}
          aria-label="Remove file"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {readError ? (
        <div className="flex items-center gap-2 px-5 py-4 text-sm text-[#9d3f2b]">
          <AlertTriangle size={15} />
          {readError} — remove and try again.
        </div>
      ) : (
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Student name */}
          <div>
            <label className="label" htmlFor={`name-${entry.id}`}>
              Student name
            </label>
            <input
              id={`name-${entry.id}`}
              className="field mt-1"
              placeholder="e.g. Amina Yusuf"
              value={meta.studentName}
              onChange={(e) => onChange({ studentName: e.target.value })}
              disabled={disabled}
              data-testid={`input-student-name-${index}`}
            />
          </div>

          {/* Student ID */}
          <div>
            <label className="label" htmlFor={`sid-${entry.id}`}>
              Student ID
            </label>
            <input
              id={`sid-${entry.id}`}
              className="field mt-1"
              placeholder="e.g. s204812"
              value={meta.studentId}
              onChange={(e) => onChange({ studentId: e.target.value })}
              disabled={disabled}
              data-testid={`input-student-id-${index}`}
            />
          </div>

          {/* Level */}
          <div>
            <label className="label" htmlFor={`level-${entry.id}`}>
              Level
            </label>
            <select
              id={`level-${entry.id}`}
              className="field mt-1"
              value={meta.level}
              onChange={(e) => onChange({ level: e.target.value as Level })}
              disabled={disabled}
              data-testid={`select-level-${index}`}
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          {/* Track */}
          <div>
            <label className="label" htmlFor={`track-${entry.id}`}>
              Track
            </label>
            <select
              id={`track-${entry.id}`}
              className="field mt-1"
              value={meta.track}
              onChange={(e) => onChange({ track: e.target.value as Track })}
              disabled={disabled}
              data-testid={`select-track-${index}`}
            >
              {TRACKS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Assignment ID — spans full width on larger screens, optional */}
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="label" htmlFor={`aid-${entry.id}`}>
              Assignment ID{' '}
              <span className="font-normal normal-case tracking-normal text-[#9da88b]">
                (optional — leave blank to auto-match by level &amp; track)
              </span>
            </label>
            <input
              id={`aid-${entry.id}`}
              className="field mt-1 font-mono text-xs"
              placeholder="e.g. dd518633-a246-4e7f-8951-9d5cf3037f2f"
              value={meta.assignmentId}
              onChange={(e) => onChange({ assignmentId: e.target.value })}
              disabled={disabled}
              data-testid={`input-assignment-id-${index}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
