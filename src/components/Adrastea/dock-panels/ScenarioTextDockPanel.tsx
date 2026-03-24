import { useEffect, useState } from 'react';
import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { ScenarioTextPanel } from '../ScenarioTextPanel';

export function ScenarioTextDockPanel() {
  const ctx = useAdrasteaContext();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    ctx.registerPanel('scenarioText');
    return () => ctx.unregisterPanel('scenarioText');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ScenarioTextPanel
      texts={ctx.scenarioTexts}
      selectedId={selectedId}
      onSelect={(id) => {
        setSelectedId(id);
        ctx.clearAllEditing();
        ctx.setEditingScenarioTextId(id);
      }}
      onAdd={() => {
        const lastChannel = ctx.scenarioTexts.length > 0
          ? ctx.scenarioTexts[ctx.scenarioTexts.length - 1].channel_id
          : 'info';
        ctx.addScenarioText({ title: '新規テキストメモ', content: '', channel_id: lastChannel });
      }}
      onRemove={ctx.removeScenarioText}
      onReorderTexts={ctx.reorderScenarioTexts}
      onSendToChat={(textId) => {
        const t = ctx.scenarioTexts.find(st => st.id === textId);
        if (!t || !t.content) return;
        const char = t.speaker_character_id ? ctx.characters.find(c => c.id === t.speaker_character_id) : null;
        const msgType = 'chat' as const;
        const charName = t.speaker_name || char?.name;
        const charAvatar = char?.images[char.active_image_index]?.url ?? null;
        ctx.handleSendMessage(t.content, msgType, charName, charAvatar, t.channel_id ?? undefined);
      }}
      onCopy={(textId) => {
        const t = ctx.scenarioTexts.find(st => st.id === textId);
        if (!t) return;
        navigator.clipboard.writeText(JSON.stringify({
          kind: 'scenario_text',
          data: { title: t.title, content: t.content, speaker_character_id: t.speaker_character_id, speaker_name: t.speaker_name, channel_id: t.channel_id },
        }));
        ctx.showToast(`${t.title || 'テキストメモ'} をコピーしました`, 'success');
      }}
      onDuplicate={(textId) => {
        const t = ctx.scenarioTexts.find(st => st.id === textId);
        if (!t) return;
        ctx.addScenarioText({
          title: `${t.title} (複製)`,
          content: t.content,
          speaker_character_id: t.speaker_character_id,
          speaker_name: t.speaker_name,
          channel_id: t.channel_id,
        });
      }}
      onPaste={async () => {
        try {
          const text = await navigator.clipboard.readText();
          const parsed = JSON.parse(text);
          if (parsed?.kind === 'scenario_text' && parsed.data) {
            await ctx.addScenarioText({
              title: parsed.data.title ? `${parsed.data.title} (コピー)` : '新規テキストメモ',
              content: parsed.data.content ?? '',
              speaker_character_id: parsed.data.speaker_character_id ?? null,
              speaker_name: parsed.data.speaker_name ?? null,
              channel_id: parsed.data.channel_id ?? null,
            });
            ctx.showToast('テキストメモを貼り付けました', 'success');
          }
        } catch {
          // クリップボードが対応フォーマットでない場合は何もしない
        }
      }}
      channels={ctx.channels}
    />
  );
}
