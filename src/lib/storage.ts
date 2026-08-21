/* 学習データの保存先。
 * ブラウザでは localStorage、ネイティブでは Capacitor Preferences（端末のネイティブ保存領域）を使う。
 * WKWebView/WebView の localStorage は空き容量が逼迫するとOSに消される可能性があるため、
 * アプリとして配信する場合はネイティブ側へ置く。 */
import { Preferences } from '@capacitor/preferences';
import { isNative } from './platform';

export async function loadRaw(key: string): Promise<string | null> {
  if (isNative()) {
    try {
      const { value } = await Preferences.get({ key });
      return value ?? null;
    } catch {
      return null;
    }
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** 保存は書きっぱなし（失敗しても学習は継続できる）。 */
export function saveRaw(key: string, value: string): void {
  if (isNative()) {
    void Preferences.set({ key, value }).catch(() => undefined);
    return;
  }
  try {
    localStorage.setItem(key, value);
  } catch {
    /* 保存不可でも学習は継続できる */
  }
}
