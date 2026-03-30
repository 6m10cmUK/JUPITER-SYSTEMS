# BGM管理

シーン別・複数トラック同時再生対応。フェード付き自動再生。

### トラック作成・管理

BGMパネルの「+」で新規トラック追加。YouTube / 直接URL / Cloudflare R2アップロードの3方式対応。Dropbox・Google Drive 共有リンク自動正規化。各トラックは個別ボリューム・ループ設定。

### シーン割当・自動再生

各BGMトラックは scene_ids リスト で複数シーンに割当可能。auto_play_scene_ids で指定シーン切替時の自動再生設定。同一シーン内複数トラック同時再生をサポート。

### 再生・停止・フェード

再生/停止ボタン、またはシーン切替時自動制御。fade_in / fade_in_duration で入場フェード。scene 切替時に前シーンBGMは自動停止、新シーン対象BGMは自動再生。

### ボリューム制御

トラック個別ボリューム（0～1）、全体マスターボリューム（localStorage 保存）。ミュート機能で全BGM消音。OBS風ボリュームフェーダーUI。

### エンジン・ストリーム管理

BgmEngine.tsx でWeb Audio API 管理。orphan トラック（どのシーンにも属さないトラック）はルーム入室時に自動検出・削除。シーン削除によって新たに orphan が発生した場合も即時削除する。シーン切替時の setTimeout は sceneTimersRef で管理、cleanup で漏洩防止。

## シーン遷移挙動

BgmEngine がシーン切替を検知し、前シーンの BGM を停止・新シーンの BGM を開始する。

activeScene?.id 変更をトリガーに tracksToStop（前シーンのみ対象）と tracksToStart（auto_play_scene_ids が新シーンを含む）を抽出。tracksToStart のフェードイン時間の最大値（maxFadeInDuration）+ 100ms のタイマーで前シーン BGM を遅延停止（フェードの重なりを確保）。

フェードイン設定がある場合は fade_in_duration でボリュームを徐々に上げる。orphan トラック（scene_ids.length === 0）は即時停止。タイマーは sceneTimersRef で管理し、useEffect cleanup で漏洩防止。
