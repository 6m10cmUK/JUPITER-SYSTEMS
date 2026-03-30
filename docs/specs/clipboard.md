# クリップボード入出力

Ctrl+C / Ctrl+V / Ctrl+D でオブジェクト・シーン複製・コピペ。

## オブジェクトコピー

選択オブジェクト複数個を JSON形式 でクリップボード保存。format：objectToClipboardJson() で統一。

clipboard JSON：
```
{
  "version": "1.0",
  "objects": [
    { "type": "panel", "name": "...", "x": ..., "y": ..., ... },
    ...
  ]
}
```

## ペースト（Ctrl+V）

LayerPanel / Board で Ctrl+V 実行。clipboard JSON parse → 新規オブジェクト一括作成。座標は オフセット（board center 付近）を適用。

## 複製（Ctrl+D）

選択オブジェクト複数個を複製。複製後の名前は以下のルールで自動生成（BGM以外の全エンティティ共通）：
- 末尾が `(n)` 形式でない場合: `元の名前(2)` にする
- 末尾が `(n)` 形式の場合: `元の名前(n+1)` にする（例: `マップA(2)` → `マップA(3)`）

## 削除（Delete）

選択オブジェクト削除。background / foreground / characters_layer type は削除不可（ロック状態）。

## シーン複製

ScenePanel 右クリック「複製」で、シーン全体（配下オブジェクト含）複製。background / foreground も複製。ルームスコープのオブジェクト（シーンに属さず全シーン共通で表示されるもの）はシーンに属さないため複製対象外。
