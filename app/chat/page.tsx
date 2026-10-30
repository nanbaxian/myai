import KnowledgeChat from '@/components/KnowledgeChatDemo'

// Rendered per request so the page always reflects the current sign-in state.
export const dynamic = 'force-dynamic'

export default function ChatPage() {
  return <KnowledgeChat />
}
