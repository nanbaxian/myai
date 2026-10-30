import KnowledgeChatDemo from '@/components/KnowledgeChatDemo'

// Rendered per request so the Clerk middleware guards every visit (no static prerendering).
export const dynamic = 'force-dynamic'

export default async function ChatPage({
  params,
}: {
  params: Promise<{ botId: string }>
}) {
  const { botId } = await params
  return <KnowledgeChatDemo botId={botId} />
}
