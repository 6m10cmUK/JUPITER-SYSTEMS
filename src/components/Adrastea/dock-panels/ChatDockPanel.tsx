import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import ChatPanel from '../ChatPanel';

export function ChatDockPanel() {
  const ctx = useAdrasteaContext();
  return (
    <ChatPanel
      messages={ctx.messages}
      loading={ctx.chatLoading}
      hasMore={ctx.hasMore}
      senderName={ctx.profile?.display_name ?? 'ユーザー'}
      senderAvatar={ctx.profile?.avatar_url}
      roomName={ctx.room?.name}
      characters={ctx.characters}
      onSendMessage={ctx.handleSendMessage}
      onLoadMore={ctx.loadMore}
    />
  );
}
