-- Adrastea: 全テーブルの Realtime を有効化
-- supabase_realtime publication にテーブルを追加

ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scenes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.objects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bgms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.characters_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.characters_base;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pieces;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cutins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scenario_texts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
