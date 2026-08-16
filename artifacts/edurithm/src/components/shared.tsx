import { type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { AlertTriangle, ArrowRight, BookOpen, Briefcase, Check, ChevronRight, CircleHelp, Code2, FileUp, LayoutDashboard, LogOut, ScanSearch, Upload, X } from 'lucide-react';

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 focus-ring" data-testid="link-brand">
      <span className={`grid h-9 w-9 place-items-center rounded-xl ${inverse ? 'bg-[#d7f34b] text-[#162239]' : 'bg-[#162239] text-[#d7f34b]'}`}>
        <Code2 size={18} strokeWidth={2.5} />
      </span>
      <span className={`font-display text-[1.15rem] font-bold tracking-tight ${inverse ? 'text-[#f8f4e9]' : 'text-[#162239]'}`}>EduRithm</span>
    </Link>
  );
}

export function StudentNav() {
  const [location] = useLocation();
  return (
    <header className="relative z-10 border-b border-[#1c2a40]/10 bg-[#f7f3ea]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-4 lg:px-8">
        <Brand />
        <nav className="flex items-center gap-1.5 sm:gap-3">
          <Link href="/review" className={`focus-ring flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${location === '/review' ? 'bg-[#dfe8a7] text-[#162239]' : 'text-[#536078] hover:bg-[#ece7dc] hover:text-[#162239]'}`} data-testid="link-review">
            <ScanSearch size={16} /> <span className="hidden sm:inline">Review</span>
          </Link>
          <Link href="/learn" className={`focus-ring flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${location === '/learn' ? 'bg-[#dfe8a7] text-[#162239]' : 'text-[#536078] hover:bg-[#ece7dc] hover:text-[#162239]'}`} data-testid="link-learn">
            <BookOpen size={16} /> <span className="hidden sm:inline">Learn</span>
          </Link>
          <Link href="/opportunities" className={`focus-ring flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${location === '/opportunities' ? 'bg-[#dfe8a7] text-[#162239]' : 'text-[#536078] hover:bg-[#ece7dc] hover:text-[#162239]'}`} data-testid="link-opportunities">
            <Briefcase size={16} /> <span className="hidden sm:inline">Opportunities</span>
          </Link>
          <Link href="/instructor" className="focus-ring flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-[#536078] transition-colors hover:bg-[#ece7dc] hover:text-[#162239]" data-testid="link-instructor">
            <span className="hidden sm:inline">Instructor view</span><ChevronRight size={15} />
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function InstructorSidebar({ onLogout }: { onLogout?: () => void }) {
  const [location] = useLocation();
  const links = [
    { href: '/instructor', label: 'Class pulse', icon: LayoutDashboard },
    { href: '/instructor/upload', label: 'Batch upload', icon: Upload },
  ];
  return (
    <aside className="flex w-full flex-col bg-[#162239] px-5 py-5 text-[#f7f3ea] md:min-h-[100dvh] md:w-[250px] md:shrink-0 md:px-6 md:py-7">
      <Brand inverse />
      <div className="mt-10 flex flex-1 flex-col">
        <p className="eyebrow mb-3 text-[#99a5b6]">Instructor studio</p>
        <nav className="space-y-1.5">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`focus-ring flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold transition-colors ${location === href ? 'bg-[#d7f34b] text-[#162239]' : 'text-[#c2ccda] hover:bg-[#23324b] hover:text-[#f7f3ea]'}`} data-testid={`link-instructor-${label.toLowerCase().replace(' ', '-')}`}>
              <Icon size={17} /> {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto hidden rounded-xl border border-[#40506a] bg-[#1e2d45] p-4 md:block">
          <p className="font-display text-sm font-bold">Feedback, not fear.</p>
          <p className="mt-1 text-xs leading-relaxed text-[#aeb9c9]">A quieter way to see where your class needs you.</p>
        </div>
      </div>
      {onLogout && <button className="mt-6 flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-bold text-[#aeb9c9] transition-colors hover:bg-[#23324b] hover:text-[#f7f3ea]" onClick={onLogout} data-testid="button-logout"><LogOut size={17} /> Sign out</button>}
    </aside>
  );
}

export function ScoreRing({ score, size = 'md' }: { score: number | null; size?: 'sm' | 'md' | 'lg' }) {
  const safe = Math.max(0, Math.min(100, score ?? 0));
  const dimensions = size === 'lg' ? 'h-40 w-40' : size === 'sm' ? 'h-12 w-12' : 'h-24 w-24';
  const text = size === 'lg' ? 'text-4xl' : size === 'sm' ? 'text-xs' : 'text-2xl';
  return (
    <div className={`${dimensions} relative grid shrink-0 place-items-center rounded-full`} style={{ background: `conic-gradient(#d7f34b ${safe * 3.6}deg, #dfe2d7 0deg)` }} data-testid="display-score-ring">
      <div className={`grid h-[calc(100%-8px)] w-[calc(100%-8px)] place-items-center rounded-full bg-[#f7f3ea] font-display font-bold text-[#162239] ${text}`}>
        {score === null ? '—' : score}
        {size !== 'sm' && score !== null && <span className="ml-0.5 mt-1 text-xs font-bold">/100</span>}
      </div>
    </div>
  );
}

export function StatusPill({ status, flagged }: { status?: string; flagged?: boolean }) {
  if (flagged) return <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f9ddd5] px-2.5 py-1 text-xs font-bold text-[#9d3f2b]"><AlertTriangle size={12} /> Needs a look</span>;
  if (status === 'queued') return <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ece7dc] px-2.5 py-1 text-xs font-bold text-[#6a7180]"><span className="h-1.5 w-1.5 rounded-full bg-[#9b9fa8]" /> In queue</span>;
  if (status === 'failed') return <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f9ddd5] px-2.5 py-1 text-xs font-bold text-[#9d3f2b]"><X size={12} /> Could not grade</span>;
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e4f0bc] px-2.5 py-1 text-xs font-bold text-[#47611c]"><Check size={12} /> Reviewed</span>;
}

export function MetricCard({ label, value, detail, accent = 'lime' }: { label: string; value: string | number; detail: string; accent?: 'lime' | 'coral' | 'ink' }) {
  return <div className={`card-lift relative overflow-hidden p-5 ${accent === 'lime' ? 'bg-[#edf4c9]' : accent === 'coral' ? 'bg-[#f9ddd5]' : 'bg-[#162239] text-[#f7f3ea]'}`}><span className={`absolute right-4 top-4 h-2 w-2 rounded-full ${accent === 'coral' ? 'bg-[#d95e49]' : accent === 'ink' ? 'bg-[#d7f34b]' : 'bg-[#9ebc28]'}`} /><p className={`eyebrow ${accent === 'ink' ? 'text-[#aeb9c9]' : 'text-[#69734f]'}`}>{label}</p><p className="mt-4 font-display text-4xl font-bold tracking-tight">{value}</p><p className={`mt-1 text-xs ${accent === 'ink' ? 'text-[#b6c2d1]' : 'text-[#68705d]'}`}>{detail}</p></div>;
}

export function SkeletonBlock({ className = '' }: { className?: string }) { return <div className={`skeleton ${className}`} aria-label="Loading" data-testid="state-loading" />; }
export function ErrorState({ message = 'We could not load this just now.', onRetry }: { message?: string; onRetry?: () => void }) {
  return <div className="card-lift flex flex-col items-center justify-center p-10 text-center"><CircleHelp className="text-[#d95e49]" size={28} /><h3 className="mt-4 font-display text-xl font-bold">A small snag</h3><p className="mt-2 max-w-sm text-sm text-[#687386]">{message}</p>{onRetry && <button className="btn-outline mt-5" onClick={onRetry} data-testid="button-retry">Try again</button>}</div>;
}
export function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <div className="card-lift flex flex-col items-center justify-center p-10 text-center"><div className="grid h-12 w-12 place-items-center rounded-xl bg-[#edf4c9] text-[#536c1c]"><BookOpen size={21} /></div><h3 className="mt-4 font-display text-xl font-bold">{title}</h3><p className="mt-2 max-w-sm text-sm leading-relaxed text-[#687386]">{detail}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

export function FileDrop({ fileName, onFile }: { fileName: string; onFile: (file: File) => void }) {
  return <label className="group block cursor-pointer rounded-xl border border-dashed border-[#9da88b] bg-[#f0f4d9] p-6 text-center transition-colors hover:border-[#829b21] hover:bg-[#e8efc5]" data-testid="input-file-upload">
    <input className="sr-only" type="file" accept=".html,.htm" onChange={(event) => { const file = event.target.files?.[0]; if (file) onFile(file); }} />
    <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-[#d7f34b] text-[#162239]"><FileUp size={20} /></span>
    <span className="mt-3 block text-sm font-bold text-[#263550]">{fileName || 'Choose an HTML file'}</span>
    <span className="mt-1 block text-xs text-[#69734f]">{fileName ? 'Ready to read' : 'Drop it here, or browse your files'}</span>
  </label>;
}

export function PageTitle({ eyebrow, title, detail, children }: { eyebrow: string; title: string; detail?: string; children?: ReactNode }) {
  return <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="eyebrow">{eyebrow}</p><h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-[#162239] sm:text-5xl">{title}</h1>{detail && <p className="mt-3 max-w-2xl text-[.98rem] leading-relaxed text-[#687386]">{detail}</p>}</div>{children}</div>;
}

export function ArrowLink({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  return <Link href={href} className={`group inline-flex items-center gap-2 font-bold text-[#536c1c] transition-colors hover:text-[#162239] ${className}`} data-testid={`link-${href.replaceAll('/', '').replace(':', '-') || 'home'}`}>{children}<ArrowRight className="transition-transform group-hover:translate-x-1" size={16} /></Link>;
}

export function formatDate(value: string) {
  try { return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)); } catch { return value; }
}