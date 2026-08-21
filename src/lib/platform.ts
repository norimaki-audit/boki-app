import { Capacitor } from '@capacitor/core';

/** ネイティブ（Capacitorで包んだiOS/Androidアプリ）で動いているか。ブラウザでは false。 */
export const isNative = (): boolean => Capacitor.isNativePlatform();
