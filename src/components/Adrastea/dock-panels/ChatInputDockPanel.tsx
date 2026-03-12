import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import ChatInputPanel from '../ChatInputPanel';

export function ChatInputDockPanel() {
  const ctx = useAdrasteaContext();
  return (
    <ChatInputPanel
      characters={ctx.characters}
      onSendMessage={ctx.handleSendMessage}
    />
  );
}
