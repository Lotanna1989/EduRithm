import { useState } from 'react';
import {
  Award,
  Briefcase,
  Clock,
  ExternalLink,
  Globe,
  Landmark,
  Linkedin,
  Loader2,
  LogOut,
  MapPin,
  RefreshCw,
  Sparkles,
  Trophy,
  Wifi,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useLoginOpportunities,
  useGetOppSession,
  useLogoutOpportunities,
  useGetOppFeed,
  useRefreshOppFeed,
  getGetOppSessionQueryKey,
  getGetOppFeedQueryKey,
} from '@workspace/api-client-react';
import type { OppOpportunity } from '@workspace/api-client-react';
import { StudentNav, SkeletonBlock } from '@/components/shared';

// ─── Nigerian states ──────────────────────────────────────────────────────────

const STATES: { state: string; region: string }[] = [
  { state: 'Abia', region: 'South East' },
  { state: 'Adamawa', region: 'North East' },
  { state: 'Akwa Ibom', region: 'South South' },
  { state: 'Anambra', region: 'South East' },
  { state: 'Bauchi', region: 'North East' },
  { state: 'Bayelsa', region: 'South South' },
  { state: 'Benue', region: 'North Central' },
  { state: 'Borno', region: 'North East' },
  { state: 'Cross River', region: 'South South' },
  { state: 'Delta', region: 'South South' },
  { state: 'Ebonyi', region: 'South East' },
  { state: 'Edo', region: 'South South' },
  { state: 'Ekiti', region: 'South West' },
  { state: 'Enugu', region: 'South East' },
  { state: 'FCT', region: 'North Central' },
  { state: 'Gombe', region: 'North East' },
  { state: 'Imo', region: 'South East' },
  { state: 'Jigawa', region: 'North West' },
  { state: 'Kaduna', region: 'North West' },
  { state: 'Kano', region: 'North West' },
  { state: 'Katsina', region: 'North West' },
  { state: 'Kebbi', region: 'North West' },
  { state: 'Kogi', region: 'North Central' },
  { state: 'Kwara', region: 'North Central' },
  { state: 'Lagos', region: 'South West' },
  { state: 'Nasarawa', region: 'North Central' },
  { state: 'Niger', region: 'North Central' },
  { state: 'Ogun', region: 'South West' },
  { state: 'Ondo', region: 'South West' },
  { state: 'Osun', region: 'South West' },
  { state: 'Oyo', region: 'South West' },
  { state: 'Plateau', region: 'North Central' },
  { state: 'Rivers', region: 'South South' },
  { state: 'Sokoto', region: 'North West' },
  { state: 'Taraba', region: 'North East' },
  { state: 'Yobe', region: 'North East' },
  { state: 'Zamfara', region: 'North West' },
];

// ─── Category config ──────────────────────────────────────────────────────────

type Category = 'all' | 'hackathon' | 'government' | 'oil_gas' | 'certification' | 'general';

const CATS: { id: Category; label: string; icon: typeof Trophy }[] = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'hackathon', label: 'Hackathons', icon: Trophy },
  { id: 'government', label: 'Government', icon: Landmark },
  { id: 'oil_gas', label: 'Oil & Gas', icon: Briefcase },
  { id: 'certification', label: 'Certifications', icon: Award },
  { id: 'general', label: 'General', icon: Globe },
];

const CAT_COLORS: Record<string, string> = {
  hackathon: 'bg-[#d7f34b]/15 text-[#8da923] border-[#d7f34b]/40',
  government: 'bg-blue-50 text-blue-700 border-blue-200',
  oil_gas: 'bg-amber-50 text-amber-700 border-amber-200',
  certification: 'bg-purple-50 text-purple-700 border-purple-200',
  linkedin: 'bg-sky-50 text-sky-700 border-sky-200',
  general: 'bg-[#f0ede5] text-[#536078] border-[#dedbd2]',
};

// ─── Login gate ───────────────────────────────────────────────────────────────

function LoginGate({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState('');
  const login = useLoginOpportunities();

  const selected = STATES.find((s) => s.state === state);

  function submit() {
    if (!name.trim() || !email.trim() || !state) return;
    login.mutate(
      { data: { name: name.trim(), email: email.trim(), state, region: selected!.region } },
      { onSuccess }
    );
  }

  return (
    <div className="mx-auto mt-12 max-w-md">
      <div className="card-lift p-8">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#162239] px-3 py-1.5 text-xs font-bold text-[#d7f34b]">
          <Sparkles size={12} /> Opportunities Hub
        </div>
        <h1 className="font-display text-3xl font-bold text-[#162239]">
          Find your next opportunity.
        </h1>
        <p className="mt-2 text-[#536078]">
          Tell us where you are and we'll use AI to surface hackathons, government
          programmes, oil & gas tech roles, and career advice tailored to your region — all in one place.
        </p>
        <p className="mt-1 text-xs text-[#9da9b8]">
          We query Gemini once and cache your results for 24 hours so you're never charged twice.
        </p>

        <div className="mt-7 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#687386] mb-1.5">Your name</label>
            <input
              className="field w-full"
              placeholder="Ada Lovelace"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-opp-name"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#687386] mb-1.5">Email address</label>
            <input
              type="email"
              className="field w-full"
              placeholder="ada@university.edu.ng"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="input-opp-email"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#687386] mb-1.5">Your state</label>
            <select
              className="field w-full"
              value={state}
              onChange={(e) => setState(e.target.value)}
              data-testid="select-opp-state"
            >
              <option value="">Select your state…</option>
              {STATES.map((s) => (
                <option key={s.state} value={s.state}>
                  {s.state} ({s.region})
                </option>
              ))}
            </select>
          </div>

          {login.isError && (
            <p className="text-sm text-[#ef775b]">Something went wrong. Please try again.</p>
          )}

          <button
            className="btn-primary w-full"
            disabled={!name.trim() || !email.trim() || !state || login.isPending}
            onClick={submit}
            data-testid="button-opp-login"
          >
            {login.isPending ? (
              <><Loader2 size={15} className="animate-spin" /> Loading your opportunities…</>
            ) : (
              <>Show my opportunities</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Opportunity card ─────────────────────────────────────────────────────────

function OppCard({ opp }: { opp: OppOpportunity }) {
  const colorClass = CAT_COLORS[opp.category] ?? CAT_COLORS.general;

  return (
    <div className="card-lift flex flex-col gap-4 p-5" data-testid={`card-opp-${opp.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${colorClass}`}>
              {opp.platform}
            </span>
            {opp.isRemote && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                <Wifi size={10} /> Remote
              </span>
            )}
          </div>
          <h3 className="font-display text-lg font-bold text-[#162239] leading-snug">{opp.title}</h3>
        </div>
        {opp.link && (
          <a
            href={opp.link}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 grid h-8 w-8 place-items-center rounded-lg border border-[#dedbd2] bg-[#f7f3ea] text-[#687386] transition hover:border-[#162239] hover:text-[#162239]"
            data-testid={`link-opp-${opp.id}`}
          >
            <ExternalLink size={14} />
          </a>
        )}
      </div>

      <p className="text-sm leading-relaxed text-[#536078]">{opp.description}</p>

      <div className="flex flex-wrap items-center gap-3 text-xs text-[#7b8491]">
        {opp.location && (
          <span className="inline-flex items-center gap-1">
            <MapPin size={11} /> {opp.location}
          </span>
        )}
        {opp.deadline && (
          <span className="inline-flex items-center gap-1">
            <Clock size={11} /> Deadline: {opp.deadline}
          </span>
        )}
      </div>

      {opp.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {opp.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-[#f0ede5] px-2 py-0.5 font-mono text-[.65rem] text-[#687386]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── LinkedIn tips panel ──────────────────────────────────────────────────────

function LinkedInTips({ tips }: { tips: string[] }) {
  return (
    <div className="card-lift p-6" data-testid="panel-linkedin-tips">
      <div className="mb-4 flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#0077b5] text-white">
          <Linkedin size={16} />
        </div>
        <h3 className="font-display text-lg font-bold text-[#162239]">LinkedIn Tips for Nigerian Grads</h3>
      </div>
      <ol className="space-y-3">
        {tips.map((tip, i) => (
          <li key={i} className="flex items-start gap-3 text-sm leading-relaxed text-[#536078]">
            <span className="shrink-0 mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-[#0077b5]/10 font-bold text-[.65rem] text-[#0077b5]">
              {i + 1}
            </span>
            {tip}
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── Feed dashboard ───────────────────────────────────────────────────────────

function FeedDashboard({ userId, onLogout }: { userId: string; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<Category>('all');
  const qc = useQueryClient();

  const sessionQuery = useGetOppSession({ query: { queryKey: getGetOppSessionQueryKey() } });
  const feedQuery = useGetOppFeed({ query: { queryKey: getGetOppFeedQueryKey(), retry: 1 } });
  const refresh = useRefreshOppFeed();
  const logout = useLogoutOpportunities();

  const feed = feedQuery.data;
  const user = sessionQuery.data;

  const filtered =
    feed?.opportunities.filter((o) =>
      activeTab === 'all' ? true : o.category === activeTab
    ) ?? [];

  function handleRefresh() {
    refresh.mutate(undefined, {
      onSuccess: (data) => {
        qc.setQueryData(getGetOppFeedQueryKey(), data);
      },
    });
  }

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetOppSessionQueryKey() });
        qc.invalidateQueries({ queryKey: getGetOppFeedQueryKey() });
        onLogout();
      },
    });
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Opportunities Hub</p>
          <h1 className="font-display text-3xl font-bold text-[#162239] sm:text-4xl">
            {user ? `Hello, ${user.name.split(' ')[0]}.` : 'Your opportunities.'}
          </h1>
          {user && (
            <p className="mt-1 text-[#536078]">
              Showing opportunities relevant to <span className="font-bold">{user.state}</span> ({user.region})
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {feed && (
            <span className="text-xs text-[#9da9b8]">
              {feed.cached
                ? `Cached · ${feed.cacheAge}m ago`
                : 'Just generated'}
            </span>
          )}
          <button
            className="btn-outline text-xs px-3"
            onClick={handleRefresh}
            disabled={refresh.isPending}
            data-testid="button-opp-refresh"
          >
            {refresh.isPending ? (
              <><Loader2 size={13} className="animate-spin" /> Refreshing…</>
            ) : (
              <><RefreshCw size={13} /> Refresh</>
            )}
          </button>
          <button
            className="btn-outline text-xs px-3 text-[#ef775b] hover:border-[#ef775b]"
            onClick={handleLogout}
            data-testid="button-opp-logout"
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </div>

      {/* Summary bar */}
      {feed?.summary && (
        <div className="mt-6 rounded-2xl border border-[#dedbd2] bg-[#f0ede5] px-5 py-4 text-sm leading-relaxed text-[#536078]">
          <Sparkles size={14} className="inline mr-2 text-[#8da923]" />
          {feed.summary}
        </div>
      )}

      {/* Loading state */}
      {feedQuery.isLoading && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-3 text-[#536078]">
            <Loader2 size={18} className="animate-spin text-[#8da923]" />
            <span className="text-sm">Gemini is scanning for opportunities in your region — this takes a few seconds…</span>
          </div>
          <SkeletonBlock className="h-40" />
          <SkeletonBlock className="h-40" />
          <SkeletonBlock className="h-40" />
        </div>
      )}

      {feedQuery.isError && !feed && (
        <div className="mt-8 rounded-2xl border border-[#ef775b]/30 bg-[#fef2ee] p-6 text-sm text-[#ef775b]">
          Could not load your opportunities right now. Try refreshing — Gemini may need a moment.
        </div>
      )}

      {feed && (
        <>
          {/* Category tabs */}
          <div className="mt-7 flex flex-wrap gap-2">
            {CATS.map(({ id, label, icon: Icon }) => {
              const count =
                id === 'all'
                  ? feed.opportunities.length
                  : feed.opportunities.filter((o) => o.category === id).length;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`focus-ring inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${
                    activeTab === id
                      ? 'border-[#162239] bg-[#162239] text-[#d7f34b]'
                      : 'border-[#dedbd2] bg-white text-[#536078] hover:border-[#162239] hover:text-[#162239]'
                  }`}
                  data-testid={`tab-opp-${id}`}
                >
                  <Icon size={14} />
                  {label}
                  {count > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 font-mono text-[.6rem] ${activeTab === id ? 'bg-[#d7f34b]/20 text-[#d7f34b]' : 'bg-[#f0ede5] text-[#687386]'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Cards grid */}
          {filtered.length === 0 ? (
            <p className="mt-10 text-center text-[#9da9b8]">No opportunities in this category yet.</p>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((opp) => (
                <OppCard key={opp.id} opp={opp} />
              ))}
            </div>
          )}

          {/* LinkedIn tips (always visible) */}
          {feed.linkedinTips.length > 0 && (
            <div className="mt-10">
              <LinkedInTips tips={feed.linkedinTips} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OpportunitiesPage() {
  const sessionQuery = useGetOppSession({
    query: {
      queryKey: getGetOppSessionQueryKey(),
      retry: false,
    },
  });

  const [forceLogin, setForceLogin] = useState(false);
  const loggedIn = !forceLogin && sessionQuery.data != null;

  return (
    <div className="noise app-shell bg-[#f7f3ea]">
      <StudentNav />
      <main className="mx-auto max-w-[1240px] px-5 pb-20 pt-10 lg:px-8 lg:pt-14">
        {sessionQuery.isLoading ? (
          <div className="mt-16 flex justify-center">
            <Loader2 size={28} className="animate-spin text-[#8da923]" />
          </div>
        ) : loggedIn ? (
          <FeedDashboard
            userId={sessionQuery.data!.id}
            onLogout={() => setForceLogin(true)}
          />
        ) : (
          <LoginGate onSuccess={() => setForceLogin(false)} />
        )}
      </main>
    </div>
  );
}
