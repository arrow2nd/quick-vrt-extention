# Quick VRT Extension

Quick Visual Regression Testing Chrome Extension - Preact + Bun
で構築されたブラウザ上でのビジュアルリグレッションテストツールです。

## 特徴

- 📸 **高品質スクリーンショット** - Chrome Extensions
  APIを使用した精密なキャプチャ
- 🔄 **Before/After比較** - pixelmatchライブラリによる正確な差分検出
- ⚡ **高速ビルド** - Bunによる最適化されたバンドリング
- 🎯 **Preactベース** - 軽量で高速なコンポーネントベースUI
- 📊 **3つの比較モード** - 並列表示・スライダー・差分のみ
- 💾 **履歴管理** - Chrome Storage APIによる結果保存
- 📁 **HTMLレポート** - 詳細なレポート生成とダウンロード
- ⚙️ **柔軟な設定** - 撮影遅延・画質・差分感度の調整可能

## 技術スタック

- **フロントエンド**: Preact + TypeScript
- **ビルドツール**: Bun (バンドラー・パッケージマネージャー)
- **画像処理**: pixelmatch + pngjs
- **Chrome APIs**: Tabs, Storage, Downloads, Notifications
- **スタイル**: Pure CSS（軽量化のためフレームワーク不使用）

## 開発環境のセットアップ

### 必要な環境

- Bun >= 1.0.0
- Node.js >= 16.0.0（Chrome拡張開発用）

af### インストール

```bash
# リポジトリをクローン
git clone https://github.com/arrow2nd/quick-vrt-extension.git
cd quick-vrt-extension

# 依存関係をインストール
bun install

# ビルド
bun run build
```

### 開発コマンド

```bash
# 開発ビルド（ウォッチモード）
bun run dev

# プロダクションビルド
bun run build

# 型チェック
bun run type-check

# リンター実行
bun run lint

# プロジェクトクリーンアップ
bun run clean
```

### Chrome拡張としてのインストール

1. `bun run build` でプロジェクトをビルド
2. Chromeで `chrome://extensions/` を開く
3. 「デベロッパーモード」を有効にする
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. `dist` フォルダを選択

## プロジェクト構成

```
quick-vrt-extension/
├── src/
│   ├── popup/                 # ポップアップUI
│   │   ├── components/        # Preactコンポーネント
│   │   ├── hooks/            # カスタムフック
│   │   ├── styles.css        # UIスタイル
│   │   ├── popup.html        # ポップアップHTML
│   │   └── index.tsx         # メインエントリーポイント
│   ├── background/           # バックグラウンドスクリプト
│   │   └── index.ts          
│   ├── content/              # コンテンツスクリプト
│   │   └── index.ts
│   └── shared/               # 共通コード
│       ├── types.ts          # 型定義
│       ├── chrome-api.ts     # Chrome API ラッパー
│       └── image-utils.ts    # 画像処理ユーティリティ
├── dist/                     # ビルド成果物
├── icons/                    # 拡張機能アイコン
├── manifest.json             # Chrome拡張機能設定
├── package.json              # プロジェクト設定
├── tsconfig.json            # TypeScript設定
└── README.md
```

## 使用方法

### 推奨：タブモードで使用

Chrome拡張のポップアップはフォーカスを失うと閉じてしまうため、**タブモード**での使用を推奨します：

1. **拡張機能アイコンをクリック** → 自動的に新しいタブで開きます
2. タブを切り替えても拡張機能は**継続して使用可能**
3. 複数のタブから自由にスクリーンショットを撮影できます

### 基本的なワークフロー

1. **拡張機能を開く**（アイコンクリックで新しいタブが開きます）
2. **「新しい比較」**を選択
3. **Before**:
   - タブ一覧から対象タブを選択
   - スクリーンショットを撮影
4. **After**:
   - 別のタブまたは同じタブの別状態を選択
   - スクリーンショットを撮影
5. **自動比較**: 差分が自動的に計算・表示される
6. **結果確認**: 3つのモードで比較結果を確認
7. **保存**: HTMLレポートとしてダウンロード可能

### 右クリックメニューからの使用

ページ上で右クリック → **Quick VRT** から：

- **Beforeスクリーンショットを撮影**
- **Afterスクリーンショットを撮影**
- **VRTツールをタブで開く**

### 比較表示モード

- **並列表示**: Before・After・Diff画像を横並びで表示
- **スライダー**: 重ねた画像をスライダーで比較
- **差分のみ**: 変更箇所のみをハイライト表示

### 設定オプション

- **撮影遅延**: ページ読み込み後の待機時間
- **画像品質**: 高画質・標準・低画質から選択
- **差分検出感度**: 0.0〜1.0の範囲で調整
- **差分色**: ハイライト色の変更

## 元のCLIツールとの違い

この拡張機能は [quick-vrt](https://github.com/arrow2nd/quick-vrt)
CLIツールをベースに開発されました。

### 主な変更点

| 機能               | CLIツール             | Chrome拡張                       |
| ------------------ | --------------------- | -------------------------------- |
| 実行環境           | Node.js + Puppeteer   | ブラウザ + Chrome Extensions API |
| UI                 | TUI (Terminal)        | Preactベースのポップアップ       |
| スクリーンショット | Puppeteerによる自動化 | アクティブタブのキャプチャ       |
| 画像処理           | Node.jsバイナリ       | ブラウザ内Canvas API             |
| レポート           | ファイルシステム出力  | ダウンロードAPI                  |
| 設定               | コマンドライン引数    | Chrome Storage API               |

## 開発について

### アーキテクチャ

- **Popup Script**: UIコンポーネントとメイン機能
- **Background Script**: Chrome API呼び出しとコンテキストメニュー
- **Content Script**: ページ内前処理（アニメーション無効化等）
- **Shared Utilities**: 画像処理・API呼び出しの共通機能

### Bunを選択した理由

1. **高速ビルド**: TypeScriptバンドルが数秒で完了
2. **一体型ツール**: パッケージマネージャー・バンドラー・ランタイムが統合
3. **軽量出力**: 最適化されたバンドルサイズ
4. **開発体験**: ホットリロード・詳細なエラー出力

### パフォーマンス最適化

- Preactによる軽量DOM操作
- 必要な部分のみのコード分割
- Chrome Storage APIによる効率的なデータ管理
- Web Worker風の非同期画像処理

## 今後の予定

- [ ] アニメーション自動無効化機能の強化
- [ ] フルページスクリーンショット対応
- [ ] バッチ比較機能
- [ ] 設定のエクスポート・インポート
- [ ] Chrome Web Storeでの公開
- [ ] CI/CDパイプラインの構築

## 貢献方法

1. Issueで問題を報告または機能提案
2. フォークしてフィーチャーブランチを作成
3. 変更をコミット（`bun run lint`で確認）
4. プルリクエストを作成

## ライセンス

MIT License - [LICENSE](LICENSE)ファイルをご確認ください。

---

**Quick VRT Extension** - ブラウザで、もっと手軽に、もっと正確に！ 🚀

