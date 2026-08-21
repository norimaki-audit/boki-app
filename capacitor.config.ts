import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'jp.norimaki.shiwakenosakie',
  appName: '仕訳の先へ',
  webDir: 'dist',
  android: {
    /* 学習データは端末内で完結するので、外部からのWebコンテンツ読み込みは許可しない */
    allowMixedContent: false
  }
};

export default config;
