/**
 * Adrastea - TRPG盤面共有ツール 型定義
 *
 * Firestore構成:
 *   rooms/{roomId}                                      → Room
 *   rooms/{roomId}/pieces/{pieceId}                     → Piece
 *   rooms/{roomId}/messages/{msgId}                     → ChatMessage
 *   rooms/{roomId}/scenes/{sceneId}                     → Scene
 *   rooms/{roomId}/objects/{objectId}                   → BoardObject (global + scene_ids)
 *   rooms/{roomId}/bgms/{bgmId}                         → BgmTrack
 *   rooms/{roomId}/characters/{charId}                  → Character
 *   rooms/{roomId}/scenario_texts/{textId}              → ScenarioText
 *   rooms/{roomId}/cutins/{cutinId}                     → Cutin
 */

export interface ActiveCutin {
  cutin_id: string;
  triggered_at: number;
}

export interface Room {
  id: string;
  name: string;
  active_scene_id: string | null;
  foreground_url: string | null;
  active_cutin: ActiveCutin | null;
  dice_system: string;
  gm_can_see_secret_memo: boolean;
  created_at: number;
  updated_at: number;
}

export interface Scene {
  id: string;
  room_id: string;
  name: string;
  background_url: string | null;
  foreground_url: string | null;
  foreground_opacity: number;
  bg_transition: 'none' | 'fade';
  bg_transition_duration: number;
  fg_transition: 'none' | 'fade';
  fg_transition_duration: number;
  bg_blur: boolean;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface PieceStatus {
  label: string;
  value: number;
  max: number;
}

export interface CharacterImage {
  url: string;
  label: string;
}

export interface CharacterParameter {
  label: string;
  value: number | string;
}

export interface Piece {
  id: string;
  room_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  image_url: string | null;
  label: string;
  color: string;
  z_index: number;
  statuses: PieceStatus[];
  initiative: number;
  memo: string;
  character_id: string | null;
  created_at: number;
}

export interface Character {
  id: string;
  room_id: string;
  owner_id: string;
  name: string;
  images: CharacterImage[];
  active_image_index: number;
  color: string;
  sheet_url: string | null;
  initiative: number;
  size: number;
  statuses: PieceStatus[];
  parameters: CharacterParameter[];
  memo: string;
  secret_memo: string;
  chat_palette: string;
  is_status_private: boolean;
  is_hidden_on_board: boolean;
  is_speech_hidden: boolean;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

// --- BoardObject (統合オブジェクト) ---

export type BoardObjectType = 'panel' | 'text' | 'foreground' | 'background';

export interface BoardObject {
  id: string;
  type: BoardObjectType;
  name: string;

  // スコープ: global=true なら全シーン共通、false なら scene_ids で指定シーンのみ
  global: boolean;
  scene_ids: string[];

  // 位置・サイズ（グリッド単位: 1 = 1マス = GRID_SIZE px）
  x: number;
  y: number;
  width: number;
  height: number;

  // 表示制御
  visible: boolean;
  opacity: number;
  sort_order: number;
  locked: boolean;
  position_locked: boolean;
  size_locked: boolean;

  // panel用
  image_url: string | null;
  image_asset_id: string | null;
  background_color: string;
  image_fit: 'contain' | 'cover' | 'stretch';

  // text用
  text_content: string | null;
  font_size: number;
  font_family: string;
  letter_spacing: number;
  line_height: number;
  auto_size: boolean;
  text_align: 'left' | 'center' | 'right';
  text_vertical_align: 'top' | 'middle' | 'bottom';
  text_color: string;
  scale_x: number;
  scale_y: number;

  // メタ
  created_at: number;
  updated_at: number;
}

export interface ScenarioText {
  id: string;
  room_id: string;
  title: string;
  content: string;
  visible: boolean;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface Cutin {
  id: string;
  room_id: string;
  name: string;
  image_url: string | null;
  text: string;
  animation: 'slide' | 'fade' | 'zoom';
  duration: number;
  text_color: string;
  background_color: string;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface BgmTrack {
  id: string;
  name: string;
  bgm_type: 'youtube' | 'url' | 'upload' | null;
  bgm_source: string | null;
  bgm_volume: number;
  bgm_loop: boolean;
  scene_ids: string[];
  is_playing: boolean;
  is_paused: boolean;
  auto_play_scene_ids: string[];
  fade_in: boolean;
  fade_out: boolean;
  fade_duration: number;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface DiceResult {
  text: string;
  success: boolean;
  result: string;
  isSecret: boolean;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_name: string;
  sender_uid?: string;
  sender_avatar?: string | null;
  content: string;
  message_type: 'chat' | 'dice' | 'system';
  created_at: number;
}

export interface UserProfile {
  uid: string;
  display_name: string;
  avatar_url: string | null;
  created_at: number;
  updated_at: number;
}

export interface Asset {
  id: string;
  uid: string;
  url: string;
  r2_key: string;
  filename: string;
  title: string;
  size_bytes: number;
  width: number;
  height: number;
  tags: string[];
  asset_type: 'image' | 'audio';
  created_at: number;
}
