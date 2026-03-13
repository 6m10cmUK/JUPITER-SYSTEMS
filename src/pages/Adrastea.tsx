import React, { useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import RoomLobby from '../components/Adrastea/RoomLobby';
import { TopToolbar } from '../components/Adrastea/TopToolbar';
import { DockLayout } from '../components/Adrastea/DockLayout';
import { RoomSettingsModal } from '../components/Adrastea/RoomSettingsModal';
import { ProfileEditModal } from '../components/Adrastea/ProfileEditModal';
import { CutinOverlay } from '../components/Adrastea/CutinOverlay';
import { AdrasteaProvider, useAdrasteaContext } from '../contexts/AdrasteaContext';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../styles/theme';

/** 共通ローディング画面 */
function LoadingScreen({ progress, statusText }: { progress: number; statusText: string }) {
  return (
    <div
      className="adrastea-root"
      style={{
        position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: theme.bgBase, color: theme.textPrimary,
      }}
    >
      <div style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '24px', letterSpacing: '0.05em' }}>
        Adrastea
      </div>
      <div style={{
        width: '240px', height: '4px', background: theme.border, borderRadius: '2px', overflow: 'hidden',
      }}>
        <div style={{
          width: `${progress * 100}%`, height: '100%',
          background: theme.accent, borderRadius: '2px',
          transition: 'width 0.3s ease',
        }} />
      </div>
      <div style={{
        marginTop: '12px', fontSize: '0.8rem', color: theme.textSecondary,
      }}>
        {statusText}
      </div>
    </div>
  );
}

/** Dockview + オーバーレイ */
function AdrasteaRoom() {
  const ctx = useAdrasteaContext();

  const handleAddPiece = useCallback((label: string, color: string) => {
    const center = ctx.getBoardCenter();
    const px = center.x * 50;
    const py = center.y * 50;
    ctx.addPiece(label, color, px, py);
  }, [ctx.getBoardCenter, ctx.addPiece]);

  // ローディング画面（認証ステップ完了済み + データ読み込み中）
  if (ctx.isLoading) {
    // 認証分(1) + データステップ分 で全体進捗を計算
    const totalSteps = ctx.loadingSteps.length + 1;
    const doneSteps = 1 + ctx.loadingSteps.filter(s => s.done).length; // 認証は完了済み
    const currentStep = ctx.loadingSteps.find(s => !s.done);
    return (
      <LoadingScreen
        progress={doneSteps / totalSteps}
        statusText={currentStep ? `${currentStep.label}を読み込み中...` : '読み込み中...'}
      />
    );
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: theme.bgBase, display: 'flex', flexDirection: 'column' }}
      className="adrastea-root"
    >
      {/* TopToolbar（Dockview外、常時表示） */}
      <TopToolbar
        onAddPiece={handleAddPiece}
        onOpenSettings={() => ctx.setShowRoomSettings(true)}
        onOpenProfile={() => ctx.setShowProfileEdit(true)}
        onSignOut={ctx.signOut}
        activeScene={ctx.activeScene}
        profile={ctx.profile}
        dockviewApi={ctx.dockviewApi}
        roomName={ctx.room?.name}
      />

      {/* Dockviewエリア */}
      <div style={{ flex: 1, position: 'relative', zIndex: 0 }}>
        <DockLayout />
      </div>

      {/* 表示中のシナリオテキスト（画面下部オーバーレイ） */}
      {ctx.scenarioTexts.filter((t) => t.visible).map((text) => (
        <div
          key={text.id}
          style={{
            position: 'absolute',
            bottom: '60px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 18,
            background: 'rgba(255,255,255,0.95)',
            border: `1px solid ${theme.border}`,
            borderRadius: 0,
            padding: '16px 24px',
            maxWidth: '600px',
            maxHeight: '200px',
            overflowY: 'auto',
            color: theme.textPrimary,
          }}
        >
          {text.title && (
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px', color: theme.warning }}>
              {text.title}
            </div>
          )}
          <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
            {text.content}
          </div>
        </div>
      ))}

      {/* カットインオーバーレイ（全画面演出） */}
      <CutinOverlay
        cutins={ctx.cutins}
        activeCutin={ctx.room?.active_cutin ?? null}
        onCutinEnd={ctx.clearCutin}
      />

      {/* ルーム設定モーダル */}
      {ctx.showRoomSettings && ctx.room && (
        <RoomSettingsModal
          room={ctx.room}
          onSave={ctx.updateRoom}
          onClose={() => ctx.setShowRoomSettings(false)}
        />
      )}

      {/* プロフィール編集モーダル */}
      {ctx.showProfileEdit && ctx.profile && (
        <ProfileEditModal
          profile={ctx.profile}
          onSave={ctx.updateProfile}
          onClose={() => ctx.setShowProfileEdit(false)}
        />
      )}
    </div>
  );
}

const Adrastea: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user, isGuest, loading: authLoading, signIn, signInAsGuest, signOut } = useAuth();

  // Convex から room データを取得
  const roomData = useQuery(
    api.rooms.get,
    roomId && user ? { id: roomId } : 'skip'
  );

  useEffect(() => {
    document.title = 'Adrastea';
  }, []);

  // ログイン後に元のURLへ復帰
  useEffect(() => {
    if (!user) return;
    const saved = sessionStorage.getItem('adrastea_redirect');
    if (saved) {
      sessionStorage.removeItem('adrastea_redirect');
      navigate(saved, { replace: true });
    }
  }, [user?.uid]);

  // room_members からロール取得
  const memberRole = useQuery(
    api.room_members.getMyRole,
    (roomId && user && !isGuest) ? { room_id: roomId } : 'skip'
  );

  const joinMutation = useMutation(api.room_members.join);

  // ルーム入室時に join を呼ぶ
  useEffect(() => {
    if (roomId && user && !isGuest) {
      joinMutation({ room_id: roomId }).catch(() => {});
    }
  }, [roomId, user?.uid, isGuest]);

  // owner check 状態を算出
  const ownerCheck: 'loading' | 'ok' | 'denied' =
    !roomId ? 'ok'
    : roomData === undefined ? 'loading'
    : roomData === null ? 'denied'
    : 'ok';

  // ロール判定（ロード中は安全側の 'guest' にフォールバック）
  const roomRole = (isGuest ? 'guest' : (memberRole ?? 'guest')) as 'owner' | 'sub_owner' | 'user' | 'guest';

  const handleRoomCreated = (newRoomId: string) => {
    navigate(`/adrastea/${newRoomId}`);
  };

  // 認証ローディング（全体の最初のステップ）
  if (authLoading) {
    return <LoadingScreen progress={0} statusText="認証を確認中..." />;
  }

  // 未認証 → ログイン画面
  if (!user) {
    return (
      <div style={{
        position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: theme.bgBase,
      }}>
        <div style={{
          background: theme.bgBase, border: `1px solid ${theme.border}`, borderRadius: 0,
          padding: '40px', textAlign: 'center', color: theme.textPrimary,
          width: '340px',
        }}>
          <h2 style={{ margin: '0 0 8px', fontSize: '1.3rem' }}>Adrastea</h2>
          <p style={{ margin: '0 0 24px', color: theme.textSecondary, fontSize: '0.9rem' }}>
            TRPG盤面共有ツール
          </p>
          <button
            onClick={() => {
              sessionStorage.setItem('adrastea_redirect', window.location.pathname);
              signIn();
            }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px', background: '#fff', color: '#333',
              border: 'none', borderRadius: 0, fontSize: '0.9rem',
              fontWeight: 600, cursor: 'pointer', width: '100%', justifyContent: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Googleでログイン
          </button>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            margin: '20px 0', color: theme.textMuted, fontSize: '0.8rem',
          }}>
            <div style={{ flex: 1, height: '1px', background: theme.border }} />
            <span>または</span>
            <div style={{ flex: 1, height: '1px', background: theme.border }} />
          </div>

          <button
            onClick={() => signInAsGuest('ゲスト').catch((err) => console.error('ゲストログイン失敗:', err))}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: theme.accent,
              color: theme.bgBase,
              border: 'none',
              borderRadius: 0,
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            ゲスト参加
          </button>
        </div>
      </div>
    );
  }

  // ゲストはルームIDなしではアクセス不可（共有リンクからのみ入室）
  if (!roomId && isGuest) {
    return (
      <div
        className="adrastea-root"
        style={{
          position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: theme.bgBase, color: theme.textPrimary,
        }}
      >
        <div style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '16px' }}>
          ルームが指定されていません
        </div>
        <div style={{ fontSize: '0.9rem', color: theme.textSecondary, marginBottom: '24px' }}>
          共有リンクからルームに参加してください
        </div>
        <button
          onClick={async () => {
            await signOut();
            navigate('/adrastea');
          }}
          style={{
            padding: '10px 20px',
            background: theme.accent,
            color: theme.textOnAccent,
            border: 'none',
            borderRadius: 0,
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ログイン画面へ
        </button>
      </div>
    );
  }

  // ルーム未選択 → ロビー
  if (!roomId) {
    return <RoomLobby onRoomCreated={handleRoomCreated} />;
  }

  // オーナーチェック中
  if (ownerCheck === 'loading') {
    return <LoadingScreen progress={0.5} statusText="ルームを確認中..." />;
  }

  // オーナーでない → アクセス拒否
  if (ownerCheck === 'denied') {
    return (
      <div
        className="adrastea-root"
        style={{
          position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: theme.bgBase, color: theme.textPrimary,
        }}
      >
        <div style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '16px' }}>
          ルームが見つかりません
        </div>
        <div style={{ fontSize: '0.9rem', color: theme.textSecondary, marginBottom: '24px' }}>
          このルームは存在しないか、削除された可能性があります
        </div>
        <button
          onClick={() => navigate('/adrastea')}
          style={{
            padding: '8px 20px',
            background: theme.accent,
            color: theme.textOnAccent,
            border: 'none',
            borderRadius: 0,
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ロビーに戻る
        </button>
      </div>
    );
  }

  return (
    <AdrasteaProvider roomId={roomId} roomRole={roomRole}>
      <AdrasteaRoom />
    </AdrasteaProvider>
  );
};

export default Adrastea;
