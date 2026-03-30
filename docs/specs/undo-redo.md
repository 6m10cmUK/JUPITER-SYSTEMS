# Undo / Redo

操作履歴ステート管理（useUndoRedo フック）。スタック上限あり。

## 対象操作

シーン作成・削除・更新・並べ替え。
オブジェクト作成・削除・移動・リサイズ・更新・並べ替え。
キャラクター作成・削除・並べ替え。
BGM作成・削除・更新。
カットイン作成・削除。
シナリオテキスト作成・削除。

## スタック管理

UndoRedoHandle で push / undo / redo 操作。スタック上限（デフォルト50アクション）に達するとOLD操作を破棄。

## UI操作

TopToolbar に「↶ Undo」「↷ Redo」ボタン（disable 状態は canUndo / canRedo で制御）。キーボードショートカット Ctrl+Z / Ctrl+Y でも実行。
