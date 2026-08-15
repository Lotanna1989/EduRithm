import { useState } from 'react';
import { ArrowLeft, Check, FileUp, UploadCloud } from 'lucide-react';
import { Link } from 'wouter';
import { useCreateBatchSubmissions } from '@workspace/api-client-react';
import type { SubmissionInput } from '@workspace/api-client-react';
import { InstructorLayout, PasswordGate } from '@/pages/instructor';
import { FileDrop, PageTitle } from '@/components/shared';

export default function InstructorUploadPage() {
  return <PasswordGate><InstructorLayout><BatchUpload /></InstructorLayout></PasswordGate>;
}

function BatchUpload() {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<SubmissionInput[]>([]);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const batch = useCreateBatchSubmissions();
  const parseCsv = (text: string) => {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) throw new Error('Add a header row and at least one student.');
    const headers = lines[0].split(',').map((header) => header.trim());
    const needed = ['studentName', 'studentId', 'level', 'track', 'assignmentId', 'fileName', 'codeContent'];
    if (!needed.every((header) => headers.includes(header))) throw new Error(`Your CSV needs: ${needed.join(', ')}`);
    return lines.slice(1).map((line) => {
      const values = line.split(',').map((value) => value.trim().replace(/^"|"$/g, ''));
      const value = (key: string) => values[headers.indexOf(key)] ?? '';
      return { studentName: value('studentName'), studentId: value('studentId'), level: value('level') as SubmissionInput['level'], track: value('track') as SubmissionInput['track'], assignmentId: value('assignmentId'), fileName: value('fileName'), codeContent: value('codeContent') };
    });
  };
  const onFile = (file: File) => { setFileName(file.name); setError(''); file.text().then((text) => { try { setRows(parseCsv(text)); } catch (e) { setRows([]); setError(e instanceof Error ? e.message : 'Could not read this file.'); } }); };
  const submit = () => batch.mutate({ data: { submissions: rows } }, { onSuccess: () => setComplete(true) });
  return <div className="max-w-[1000px]"><PageTitle eyebrow="Instructor studio / intake" title="Bring in a batch." detail="Upload one CSV and let EduRithm grade the room while you make time for the people who need a little more context."><Link href="/instructor" className="btn-outline" data-testid="link-back-dashboard"><ArrowLeft size={16} /> Back to pulse</Link></PageTitle><div className="mt-10 grid gap-6 lg:grid-cols-[.8fr_1.2fr]"><section className="card-lift p-6 sm:p-8"><p className="eyebrow">01 / choose a file</p><h2 className="mt-2 font-display text-2xl font-bold">Submission roster</h2><p className="mt-3 text-sm leading-relaxed text-[#687386]">Use a CSV with the columns below. Keep each code sample in one cell, wrapped in quotes if it contains commas.</p><div className="mt-6"><FileDrop fileName={fileName} onFile={onFile} /></div><div className="mt-6 rounded-xl bg-[#162239] p-4 font-mono text-[.68rem] leading-6 text-[#dce6d7]"><p className="text-[#d7f34b]">studentName,studentId,level,track,assignmentId,fileName,codeContent</p><p className="mt-2 text-[#aeb9c9]">Amina Yusuf,s204812,100L,Digital Literacy,q-14,index.html,"&lt;!doctype html&gt;…"</p></div>{error && <p className="mt-4 rounded-lg bg-[#f9ddd5] p-3 text-sm font-bold text-[#9d3f2b]" data-testid="status-upload-error">{error}</p>}</section><section className="card-lift p-6 sm:p-8"><div className="flex items-start justify-between gap-3"><div><p className="eyebrow">02 / check your batch</p><h2 className="mt-2 font-display text-2xl font-bold">{rows.length ? `${rows.length} ready to grade` : 'Nothing queued yet'}</h2></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf4c9] text-[#536c1c]"><UploadCloud size={19} /></span></div>{rows.length ? <div className="mt-6 divide-y divide-[#e6e1d7] rounded-xl border border-[#dedbd2]">{rows.slice(0, 6).map((row, index) => <div key={`${row.studentId}-${index}`} className="flex items-center justify-between gap-3 px-4 py-3"><div><p className="text-sm font-bold">{row.studentName}</p><p className="font-mono text-[.66rem] text-[#7b8491]">{row.studentId} · {row.level}</p></div><Check size={16} className="text-[#829b21]" /></div>)}{rows.length > 6 && <p className="px-4 py-3 text-xs text-[#7b8491]">+ {rows.length - 6} more in this batch</p>}</div> : <div className="mt-6 rounded-xl border border-dashed border-[#c8c5bb] p-8 text-center"><FileUp className="mx-auto text-[#aab0a4]" size={25} /><p className="mt-3 text-sm font-bold text-[#536078]">Your preview will appear here</p><p className="mt-1 text-xs text-[#7b8491]">Nothing is sent until you confirm.</p></div>}<button className="btn-dark mt-7 w-full" disabled={!rows.length || batch.isPending || complete} onClick={submit} data-testid="button-submit-batch">{complete ? 'Batch sent for grading' : batch.isPending ? 'Sending batch…' : `Grade ${rows.length || ''} submissions`}<UploadCloud size={16} /></button>{complete && <p className="mt-4 rounded-lg bg-[#e4f0bc] p-3 text-sm font-bold text-[#47611c]" data-testid="status-upload-success">Batch accepted. Your class pulse will update as work is reviewed.</p>}{batch.isError && <p className="mt-4 rounded-lg bg-[#f9ddd5] p-3 text-sm font-bold text-[#9d3f2b]">The batch could not be sent. Check your CSV and try again.</p>}</section></div></div>;
}