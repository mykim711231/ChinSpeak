export type InAppInfo = { kind: string; label: string } | { kind: null; label: null };

/** 카카오톡·네이버·페이스북·인스타그램 내장 브라우저 감지 (음성/설치/오프라인이 제한됨) */
export function isInAppBrowser(): InAppInfo {
  if (typeof navigator === 'undefined') return { kind: null, label: null };
  const ua = navigator.userAgent;
  if (/KAKAOTALK|KAKAO/i.test(ua)) return { kind: 'kakao', label: '카카오톡' };
  if (/NAVER\(inapp/i.test(ua)) return { kind: 'naver', label: '네이버 앱' };
  if (/FBAN|FBAV/i.test(ua)) return { kind: 'facebook', label: 'Facebook' };
  if (/Instagram/i.test(ua)) return { kind: 'instagram', label: 'Instagram' };
  return { kind: null, label: null };
}

export const isIOS = () => typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);
export const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true);

export const isAndroid = () => typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
export const isSamsungBrowser = () => typeof navigator !== 'undefined' && /SamsungBrowser/i.test(navigator.userAgent);

/** Android Chrome으로 여는 intent URL. iOS/데스크톱은 일반 URL을 돌려준다. */
export function openInChromeUrl(url: string): string {
  if (!isAndroid()) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return url;
    const target = `${parsed.host}${parsed.pathname}${parsed.search}`;
    return `intent://${target}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
  } catch {
    return url;
  }
}
