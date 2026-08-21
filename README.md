# 仕訳の先へ（日商簿記3級 学習アプリ）

「取引 → 仕訳 → 帳簿（仕訳帳・補助元帳・総勘定元帳）→ 試算表 → 財務諸表」という金額の流れを、
1つのデータソースから一気通貫で体験できる学習アプリです。仕訳を登録すると全帳票へ即時に反映され、
財務諸表の金額から証憑まで逆引きトレースできます。

- サービス名: **仕訳の先へ**（日商簿記3級 / by のりまき）
- キャラクター: **カモ先輩**（常駐ヘルプ兼状況ガイド）
- バックエンドなし。全データはクライアント完結（localStorage）

## 開発

```bash
npm install
```

```bash
npm run dev
```

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバ（既定 5173。`PORT` があればそれに従う） |
| `npm run build` | 型チェック＋本番ビルド（`dist/`） |
| `npm run preview` | ビルド結果のプレビュー |
| `npm run test` | 会計エンジンの回帰テスト（Vitest） |
| `npm run typecheck` | 型チェックのみ |

## 構成

```
src/
  engine/      会計エンジン（純粋関数・UI非依存）
    engine.ts    勘定科目マスタ / 20取引シナリオ / 17論点68問ドリル / 帳票導出 / 判定
    types.ts     エンジンの型定義
    engine.test.ts  同梱セルフテスト9件を写した回帰テスト
  state/       アプリ状態
    store.tsx    state・localStorage永続化・各アクション（判定/登録/模試/バッジ）
    derive.ts    進捗・XP・バッジなど画面共通の派生値
    content.ts   UIコピー・基礎レッスン・用語集・勘定科目ガイド（確定稿）
    nav.ts       ナビゲーション、scnRows.ts 取引一覧の行データ
  screens/     画面（ダッシュボード / 学習 / 帳簿 / 財務諸表）
  components/  共通オーバーレイ（カモ先輩・モーダル・トースト・トレースバー）
  styles/      デザイントークンとコンポーネントCSS（.nm-*）
  lib/         金額整形・A4印刷・共有カードPNG・インラインCSSユーティリティ
```

### 設計上の約束

- **帳票はすべて posted な仕訳明細（JournalLine）から導出する。** UI側で再集計しない。
- `src/styles/tokens/*.css` がデザイントークンの唯一の真実。値は変更しない。
- 文言（日本語コピー）は確定稿。`src/state/content.ts` と各画面に確定値で持つ。
- 未入力は誤答扱いにしない（黄色警告のみ・誤答カウントを増やさない）。
- 学習順（n件目/20）と取引No.は別の概念として表示する。

### 画面

ダッシュボード / 基礎レッスン（はじめての会計フロー6回）/ 取引一覧 / 取引フロー（5ステップ・3モード）/
論点別ドリル / 第1問模試（15問・45点・タイマー）/ 論点マップ / 間違いノート /
仕訳帳 / 補助元帳 / 総勘定元帳 / 試算表 / 財務諸表（逆引きトレース）

### 学習モード

| モード | 挙動 |
| --- | --- |
| 理解 | 取引分析の選択肢とヒントあり。8論点で取引前ブリーフィング |
| 書いて覚える（既定） | 紙に書く→PCへ転記のステップを挿入。A4用紙の印刷あり |
| ネット試験入力 | 分析ステップとヒントなし・カモ先輩非表示。登録前に理解チェック |

### 保存データ

localStorage キー `bookkeeping-flow-lab-v1`。保存対象は
entries / completed / attempts / mode / xp / badges / combo / comboExam / writePosts /
streak / drillDone / guideOn / guideSeen / companyName / wrongLog / reviewDone /
lessons / briefSeen / briefOff。

ダッシュボードの「設定・データ管理」から、帳簿のみの初期化と学習データの全リセットができます。

## 公開

`main` への push で GitHub Actions がテストとビルドを実行し、GitHub Pages へデプロイします
（[.github/workflows/deploy.yml](.github/workflows/deploy.yml)）。サブパス配置のため、
ビルド時に `BASE_PATH=/boki-app/` を渡しています。`public/` の画像は
[src/lib/asset.ts](src/lib/asset.ts) の `asset()` 経由で参照し、配置先が変わっても解決できるようにしています。

## アプリとして配信する（Capacitor）

同じビルド成果物（`dist/`）をネイティブアプリの WebView に載せて、App Store / Google Play へ
配信できます。会計エンジンと画面はそのまま流用し、WebViewで動かない部分だけを差し替えています。

| 機能 | ブラウザ | ネイティブ |
| --- | --- | --- |
| 学習データの保存 | localStorage | Capacitor Preferences（端末のネイティブ保存領域） |
| A4 仕訳・計算用紙 | 別ウィンドウで `window.print()` | HTMLを書き出してOSの共有シート（印刷・保存） |
| 学習成果カードPNG | `<a download>` | 画像を書き出してOSの共有シート |

分岐は [src/lib/platform.ts](src/lib/platform.ts) の `isNative()` 1か所に集約し、保存は
[src/lib/storage.ts](src/lib/storage.ts)、ファイル書き出しは [src/lib/nativeFile.ts](src/lib/nativeFile.ts)
にまとめてあります。画面側のコードはブラウザ版と共通です。

### Android

必要なもの：JDK 17 と Android Studio（Android SDK・エミュレータ）。Windowsのままビルドできます。

```bash
npm run cap:sync
```

```bash
npm run android:open
```

Android Studio が開いたら Run（▶）で実機・エミュレータへインストールできます。

### iOS

必要なもの：macOS・Xcode・CocoaPods。`ios/` はMac側で生成します。

```bash
npm run ios:add && npm run cap:sync && npm run ios:open
```

### ストア提出時に用意するもの

- Apple Developer Program（年 $99）／ Google Play Console（初回 $25）
- アプリアイコン・スクリーンショット・プライバシーポリシーURL
- プライバシー表示は「データを収集しません」（本アプリは端末内で完結し、送信も収集も行いません）
- App Store のガイドライン 4.2（単なるWebサイトの再パッケージは不可）に備え、
  オフラインで完結する学習機能であることを説明できるようにしておく

## 出典

本実装は、別途用意したデザインハンドオフ（HTMLプロトタイプ・デザイントークン・
スクリーンショット）を正として移植したものです。ハンドオフ一式はこのリポジトリには含めていません。

学習用シミュレーション（架空会社）です。問題は商工会議所の出題区分表に基づくオリジナルで、
実際の過去問は使用していません。
