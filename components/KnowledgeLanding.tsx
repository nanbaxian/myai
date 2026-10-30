import Link from 'next/link'
import { ArrowRight, CheckCircle2, Database, FileText, LayoutDashboard, ShieldCheck, Sparkles } from 'lucide-react'

type Locale = 'en' | 'zh'

type Copy = {
  badge: string
  nav: { product: string; architecture: string; pricing: string; roadmap: string }
  hero: { eyebrow: string; title: string; subtitle: string; cta: string }
  stats: { label: string; value: string }[]
  sections: { pricingTitle: string; roadmapTitle: string; phases: string[] }
}

const copy: Record<Locale, Copy> = {
  en: {
    badge: 'KnowledgeOS v1.0 - Enterprise RAG Knowledge Base SaaS',
    nav: { product: 'Product', architecture: 'Architecture', pricing: 'Pricing', roadmap: 'Roadmap' },
    hero: {
      eyebrow: 'Knowledge chat for teams',
      title: 'Chat with your documents, with sources.',
      subtitle: 'Upload websites, PDFs and docs. Get answers with citations.',
      cta: 'Start chatting',
    },
    stats: [
      { label: 'Tenant isolation', value: 'Hard-enforced' },
      { label: 'Knowledge sources', value: 'Website, PDF, DOCX, QA' },
      { label: 'Citations', value: 'Chunk level' },
      { label: 'Async pipeline', value: 'Queues ready' },
    ],
    sections: {
      pricingTitle: 'Pricing',
      roadmapTitle: 'Roadmap',
      phases: [
        'Register, login, sources, bots, chat, citations',
        'Website crawl, reindex, permissions, usage',
        'Embed widget and public chat endpoint',
      ],
    },
  },
  zh: {
    badge: 'KnowledgeOS v1.0 - 企业知识库 RAG SaaS',
    nav: { product: '产品', architecture: '架构', pricing: '定价', roadmap: '路线图' },
    hero: {
      eyebrow: '团队知识库问答',
      title: '基于你的文档问答，每个答案都有出处。',
      subtitle: '上传网站、PDF 和文档，直接获得带引用的回答。',
      cta: '开始聊天',
    },
    stats: [
      { label: '租户隔离', value: '强制校验' },
      { label: '知识源', value: '网站 / PDF / DOCX / QA' },
      { label: '引用来源', value: 'Chunk 级' },
      { label: '异步链路', value: '支持 Queue' },
    ],
    sections: {
      pricingTitle: '套餐',
      roadmapTitle: '路线图',
      phases: [
        '注册、登录、知识源、Bot、聊天、引用来源',
        '网站抓取、重新索引、权限、用量统计',
        '嵌入组件和公开聊天接口',
      ],
    },
  },
}

const featureCards = [
  {
    icon: ShieldCheck,
    title: 'Tenant isolation',
    text: 'Every record, document, and chat session is scoped to a tenant boundary.',
  },
  {
    icon: Database,
    title: 'Knowledge ingestion',
    text: 'Website crawl, PDF, DOCX, and QA packs feed the same retrieval layer.',
  },
  {
    icon: FileText,
    title: 'Citation-first replies',
    text: 'Each answer can surface source cards with page, section, and URL hints.',
  },
  {
    icon: LayoutDashboard,
    title: 'Operator dashboard',
    text: 'Track sources, bots, sessions, usage, and members from one console.',
  },
]

const pricingCards = [
  { name: 'Starter', price: '$49/mo', limit: '1 bot, 3 sources, 50MB', tone: 'for pilots' },
  { name: 'Growth', price: '$149/mo', limit: '5 bots, 20 sources, 500MB', tone: 'for small teams' },
  { name: 'Business', price: '$499/mo', limit: 'Unlimited bots, 5GB', tone: 'for operations' },
  { name: 'Enterprise', price: 'Custom', limit: 'Private deployment + SLA', tone: 'for regulated orgs' },
]

export default function KnowledgeLanding({ locale }: { locale: Locale }) {
  const c = copy[locale]

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,216,140,0.16),_transparent_32%),linear-gradient(180deg,#0e1116_0%,#11161d_44%,#0b0d11_100%)] text-white">
      <div className="absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_20%_10%,rgba(248,208,122,0.18),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.08),transparent_22%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6 lg:px-10">
        <header className="mb-14 flex flex-wrap items-center justify-between gap-4 rounded-full border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-xl">
          <div>
            <div className="text-[10px] uppercase tracking-[0.36em] text-amber-200/80">{c.badge}</div>
            <div className="mt-1 text-sm text-white/80">KnowledgeOS</div>
          </div>
          <nav className="flex flex-wrap items-center gap-3 text-sm text-white/75">
            <span>{c.nav.product}</span>
            <span>{c.nav.architecture}</span>
            <span>{c.nav.pricing}</span>
            <span>{c.nav.roadmap}</span>
          </nav>
        </header>

        <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-amber-100">
              <Sparkles className="h-3.5 w-3.5" />
              {c.hero.eyebrow}
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              {c.hero.title}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">{c.hero.subtitle}</p>
            <div className="mt-8">
              <Link href="/chat" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-amber-100">
                {c.hero.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/6 p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl">
            <div className="grid gap-3 sm:grid-cols-2">
              {c.stats.map(stat => (
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="text-xs uppercase tracking-[0.26em] text-white/45">{stat.label}</div>
                  <div className="mt-3 text-2xl font-semibold text-amber-100">{stat.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-3xl border border-white/10 bg-slate-950/60 p-4">
              <div className="flex items-center gap-2 text-sm text-amber-100">
                <CheckCircle2 className="h-4 w-4" />
                Multi-layer architecture
              </div>
              <div className="mt-4 grid gap-3 text-sm text-white/75">
                <div className="rounded-2xl bg-white/5 px-4 py-3">Pages frontend</div>
                <div className="rounded-2xl bg-white/5 px-4 py-3">Workers API and orchestration</div>
                <div className="rounded-2xl bg-white/5 px-4 py-3">R2 files and queue consumers</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {featureCards.map(card => {
            const Icon = card.icon
            return (
              <article key={card.title} className="rounded-[1.75rem] border border-white/10 bg-white/6 p-5 backdrop-blur-xl">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-300/15 text-amber-100">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-white">{card.title}</h2>
                <p className="mt-2 text-sm leading-7 text-white/65">{card.text}</p>
              </article>
            )
          })}
        </section>

        <section className="mt-20 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="text-sm uppercase tracking-[0.28em] text-amber-100/80">{c.sections.pricingTitle}</div>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {pricingCards.map(card => (
                <article key={card.name} className="rounded-[1.75rem] border border-white/10 bg-white/6 p-5 backdrop-blur-xl">
                  <div className="text-sm text-amber-100/80">{card.tone}</div>
                  <div className="mt-3 flex items-end justify-between gap-4">
                    <h3 className="text-2xl font-semibold text-white">{card.name}</h3>
                    <span className="text-lg text-white/70">{card.price}</span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-white/65">{card.limit}</p>
                </article>
              ))}
            </div>
          </div>

          <article className="rounded-[2rem] border border-white/10 bg-white/6 p-6 backdrop-blur-xl">
            <div className="text-sm uppercase tracking-[0.28em] text-amber-100/80">{c.sections.roadmapTitle}</div>
            <div className="mt-8 grid gap-3">
              {c.sections.phases.map((text, i) => (
                <div key={text} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="text-xs uppercase tracking-[0.24em] text-white/45">Phase {i + 1}</div>
                  <div className="mt-2 text-sm text-white/80">{text}</div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <footer className="mt-16 flex flex-col gap-3 border-t border-white/10 pt-8 text-sm text-white/45 md:flex-row md:items-center md:justify-between">
          <div>KnowledgeOS on Cloudflare Pages + Workers + R2</div>
          <div className="flex gap-4">
            <Link href="/auth/login" className="hover:text-white">
              Login
            </Link>
            <Link href="/auth/register" className="hover:text-white">
              Register
            </Link>
          </div>
        </footer>
      </div>
    </main>
  )
}
