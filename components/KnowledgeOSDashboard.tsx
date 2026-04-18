import Link from 'next/link'
import { BarChart3, Bot, CircleDollarSign, Database, FileText, LayoutDashboard, Users, ArrowUpRight } from 'lucide-react'

type Section = 'overview' | 'sources' | 'bots' | 'conversations' | 'usage' | 'members' | 'embed'

const navItems: { key: Section; label: string; href: string; icon: typeof LayoutDashboard }[] = [
  { key: 'overview', label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { key: 'sources', label: 'Sources', href: '/dashboard/sources', icon: Database },
  { key: 'bots', label: 'Bots', href: '/dashboard/bots', icon: Bot },
  { key: 'conversations', label: 'Conversations', href: '/dashboard/conversations', icon: FileText },
  { key: 'usage', label: 'Usage', href: '/dashboard/usage', icon: BarChart3 },
  { key: 'members', label: 'Members', href: '/dashboard/members', icon: Users },
  { key: 'embed', label: 'Embed', href: '/dashboard/embed', icon: CircleDollarSign },
]

const sources = [
  { name: 'Company website', kind: 'Website', status: 'Indexing', docs: '24 pages' },
  { name: 'Product manual', kind: 'PDF', status: 'Ready', docs: '12 chapters' },
  { name: 'Sales enablement pack', kind: 'DOCX', status: 'Ready', docs: '8 files' },
  { name: 'Support QA', kind: 'QA', status: 'Ready', docs: '146 pairs' },
]

const bots = [
  { name: 'KnowledgeOS Assistant', persona: 'Professional, concise, cited', sources: 'All sources', status: 'Live' },
  { name: 'Sales Enablement Bot', persona: 'Helpful, conversion focused', sources: 'Manuals + FAQ', status: 'Draft' },
  { name: 'Internal Ops Bot', persona: 'Strict, policy aware', sources: 'Private docs', status: 'Live' },
]

const sessions = [
  ['January 18, 2026', 'Refund policy', 'bot_01', '7 messages', '3 citations'],
  ['January 17, 2026', 'Pricing exception', 'bot_02', '12 messages', '5 citations'],
  ['January 17, 2026', 'Installation steps', 'bot_01', '4 messages', '2 citations'],
]

export default function KnowledgeOSDashboard({ section }: { section: Section }) {
  const title = {
    overview: 'Workspace overview',
    sources: 'Knowledge sources',
    bots: 'Bot configuration',
    conversations: 'Conversation audit',
    usage: 'Usage and billing',
    members: 'Members and access',
    embed: 'Embed and API',
  }[section]

  return (
    <main className="min-h-screen bg-[#0b0e13] text-white">
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-white/10 bg-white/3 px-5 py-6 lg:border-b-0 lg:border-r lg:border-white/10">
          <div className="rounded-3xl border border-white/10 bg-white/6 p-5 backdrop-blur-xl">
            <div className="text-xs uppercase tracking-[0.34em] text-amber-100/80">KnowledgeOS</div>
            <div className="mt-2 text-lg font-semibold">Enterprise console</div>
            <p className="mt-2 text-sm leading-6 text-white/60">
              Tenant-aware controls for sources, bots, conversations, and usage.
            </p>
          </div>
          <nav className="mt-6 space-y-2">
            {navItems.map(item => {
              const Icon = item.icon
              const active = item.key === section
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
                    active ? 'bg-white text-slate-950' : 'text-white/70 hover:bg-white/6 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </aside>

        <section className="px-5 py-6 lg:px-8">
          <header className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/6 p-5 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-amber-100/80">Dashboard</div>
              <h1 className="mt-2 text-2xl font-semibold">{title}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/65">
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-200">Pages online</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Workers ready</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">R2 bucket attached</span>
            </div>
          </header>

          {section === 'overview' && (
            <div className="mt-6 grid gap-4 xl:grid-cols-4">
              {[
                ['Tenants', '18'],
                ['Bots', '42'],
                ['Indexed docs', '3.8k'],
                ['CSAT', '4.8/5'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[1.75rem] border border-white/10 bg-white/6 p-5 backdrop-blur-xl">
                  <div className="text-xs uppercase tracking-[0.24em] text-white/45">{label}</div>
                  <div className="mt-4 text-3xl font-semibold text-amber-100">{value}</div>
                </div>
              ))}
            </div>
          )}

          {section === 'sources' && (
            <div className="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-white/6 backdrop-blur-xl">
              <div className="grid grid-cols-[1.8fr_1fr_1fr_1fr] border-b border-white/10 px-5 py-4 text-xs uppercase tracking-[0.24em] text-white/45">
                <span>Name</span>
                <span>Type</span>
                <span>Status</span>
                <span>Coverage</span>
              </div>
              {sources.map(item => (
                <div key={item.name} className="grid grid-cols-[1.8fr_1fr_1fr_1fr] border-b border-white/6 px-5 py-4 text-sm last:border-b-0">
                  <span className="font-medium text-white">{item.name}</span>
                  <span className="text-white/65">{item.kind}</span>
                  <span className="text-amber-100">{item.status}</span>
                  <span className="text-white/65">{item.docs}</span>
                </div>
              ))}
            </div>
          )}

          {section === 'bots' && (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {bots.map(bot => (
                <article key={bot.name} className="rounded-[1.75rem] border border-white/10 bg-white/6 p-5 backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">{bot.name}</h2>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs">{bot.status}</span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-white/65">{bot.persona}</p>
                  <p className="mt-3 text-sm text-white/45">{bot.sources}</p>
                </article>
              ))}
            </div>
          )}

          {section === 'conversations' && (
            <div className="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-white/6 backdrop-blur-xl">
              <div className="grid grid-cols-[1.2fr_1fr_0.7fr_0.7fr_0.7fr] border-b border-white/10 px-5 py-4 text-xs uppercase tracking-[0.24em] text-white/45">
                <span>Date</span>
                <span>Topic</span>
                <span>Bot</span>
                <span>Messages</span>
                <span>Citations</span>
              </div>
              {sessions.map(([date, topic, bot, messages, citations]) => (
                <div key={`${date}-${topic}`} className="grid grid-cols-[1.2fr_1fr_0.7fr_0.7fr_0.7fr] border-b border-white/6 px-5 py-4 text-sm last:border-b-0">
                  <span className="text-white/75">{date}</span>
                  <span className="font-medium text-white">{topic}</span>
                  <span className="text-white/65">{bot}</span>
                  <span className="text-white/65">{messages}</span>
                  <span className="text-amber-100">{citations}</span>
                </div>
              ))}
            </div>
          )}

          {section === 'usage' && (
            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-[1.75rem] border border-white/10 bg-white/6 p-5 backdrop-blur-xl">
                <div className="text-sm uppercase tracking-[0.24em] text-white/45">This month</div>
                <div className="mt-4 space-y-4">
                  {[
                    ['Input tokens', '1.8M'],
                    ['Output tokens', '680k'],
                    ['Queries', '94k'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div className="flex items-center justify-between text-sm">
                        <span>{label}</span>
                        <span className="text-white/65">{value}</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-white/10">
                        <div className="h-2 rounded-full bg-amber-300" style={{ width: label === 'Input tokens' ? '82%' : label === 'Output tokens' ? '58%' : '74%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[1.75rem] border border-white/10 bg-white/6 p-5 backdrop-blur-xl">
                <div className="text-sm uppercase tracking-[0.24em] text-white/45">Billing posture</div>
                <p className="mt-4 text-sm leading-7 text-white/65">
                  The PRD pricing tiers map cleanly onto usage tracking, storage caps, and tenant-level quota enforcement.
                </p>
                <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-sm text-white/70">
                  Track tokens, documents, and retrieval quality from one place before attaching payment automation.
                </div>
              </div>
            </div>
          )}

          {section === 'members' && (
            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
              <div className="rounded-[1.75rem] border border-white/10 bg-white/6 p-5 backdrop-blur-xl">
                <div className="text-sm uppercase tracking-[0.24em] text-white/45">Members</div>
                <div className="mt-4 space-y-3 text-sm">
                  {[
                    ['Alyssa Chen', 'Admin'],
                    ['Marco Tan', 'Member'],
                    ['Priya Rao', 'Viewer'],
                  ].map(([name, role]) => (
                    <div key={name} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3">
                      <span>{name}</span>
                      <span className="text-white/60">{role}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[1.75rem] border border-white/10 bg-white/6 p-5 backdrop-blur-xl">
                <div className="text-sm uppercase tracking-[0.24em] text-white/45">Invite flow</div>
                <p className="mt-4 text-sm leading-7 text-white/65">
                  Invite new members by email, assign roles, and keep tenant-scoped access controlled from the start.
                </p>
                <button className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950">
                  Send invite
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {section === 'embed' && (
            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
              <div className="rounded-[1.75rem] border border-white/10 bg-white/6 p-5 backdrop-blur-xl">
                <div className="text-sm uppercase tracking-[0.24em] text-white/45">Widget snippet</div>
                <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-xs leading-6 text-amber-100">
{`<script
  src="https://cdn.knowledgeos.ai/widget.js"
  data-bot-id="bot_01"
  data-tenant="tenant_123"
></script>`}
                </pre>
              </div>
              <div className="rounded-[1.75rem] border border-white/10 bg-white/6 p-5 backdrop-blur-xl">
                <div className="text-sm uppercase tracking-[0.24em] text-white/45">Endpoints</div>
                <ul className="mt-4 space-y-3 text-sm text-white/70">
                  <li>/api/chat</li>
                  <li>/api/sources/upload</li>
                  <li>/api/conversations/:id/export</li>
                  <li>/api/retrieval-logs</li>
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
