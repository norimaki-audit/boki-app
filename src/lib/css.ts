import type { CSSProperties } from 'react';

/** CSS宣言文字列を React の style オブジェクトへ変換する。
 * デザインリファレンス（HTMLプロトタイプ）のインラインスタイルを確定値のまま移植するためのユーティリティ。 */
const cache = new Map<string, CSSProperties>();

export function css(decl: string): CSSProperties {
  const hit = cache.get(decl);
  if (hit) return hit;
  const out: Record<string, string | number> = {};
  decl.split(';').forEach(part => {
    const i = part.indexOf(':');
    if (i < 0) return;
    const prop = part.slice(0, i).trim();
    const value = part.slice(i + 1).trim();
    if (!prop || !value) return;
    const key = prop.startsWith('--') ? prop : prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    out[key] = value;
  });
  const style = out as CSSProperties;
  cache.set(decl, style);
  return style;
}

/** 静的な宣言に、動的な値を後から重ねる。 */
export function cssWith(decl: string, extra: CSSProperties): CSSProperties {
  return { ...css(decl), ...extra };
}
