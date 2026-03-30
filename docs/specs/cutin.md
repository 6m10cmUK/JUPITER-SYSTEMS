# カットイン（開発中・未完成）

現状：パネル・エディタ・オーバーレイの骨格は存在するが、大幅改修予定のため未完成扱い。レイアウト管理画面（SettingsModal）でパネルを disabled: true（グレーアウト）にしてブロック中。

全画面演出画像・テキスト表示を想定した機能。将来的に実装予定。

現時点でコードベース上に存在するもの：
- CutinPanel / CutinDockPanel — パネル骨格
- CutinEditor — 編集UI（image_url / text / animation / duration / text_color / background_color）
- CutinOverlay — slide / fade / zoom アニメーション（CSS keyframes）
- room.active_cutin フィールド — 再生状態の記録
