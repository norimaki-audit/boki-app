/* ネイティブでのファイル書き出しと共有。
 * WebView では <a download> も window.print() も使えないため、
 * 端末のキャッシュ領域へ書き出してOSの共有シート（印刷・保存を含む）に渡す。 */
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/** Blob を base64（データURLのプレフィックスなし）へ変換する */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const url = String(reader.result || '');
      resolve(url.slice(url.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
  });
}

async function shareFile(path: string, data: string, title: string, encoding?: Encoding): Promise<void> {
  const written = await Filesystem.writeFile({
    path, data, directory: Directory.Cache, ...(encoding ? { encoding } : {})
  });
  await Share.share({ title, url: written.uri });
}

/** テキスト（HTMLなど）を書き出して共有する */
export const shareText = (path: string, text: string, title: string): Promise<void> =>
  shareFile(path, text, title, Encoding.UTF8);

/** 画像などのバイナリを書き出して共有する */
export const shareBinary = (path: string, base64: string, title: string): Promise<void> =>
  shareFile(path, base64, title);
