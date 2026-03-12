import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import ChatLogPanel from '../ChatLogPanel';

export function ChatLogDockPanel() {
  const ctx = useAdrasteaContext();
  return (
    <ChatLogPanel
      messages={ctx.messages}
      loading={ctx.chatLoading}
      hasMore={ctx.hasMore}
      roomName={ctx.room?.name}
      characters={ctx.characters}
      onLoadMore={ctx.loadMore}
      onClearMessages={ctx.clearMessages}
    />
  );
}
