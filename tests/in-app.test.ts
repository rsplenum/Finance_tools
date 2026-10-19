import { describe, expect, it } from 'vitest';
import { inAppBrowser, intentUrl } from '../site/src/in-app';

// Q1: user agents as the apps send them (each app's own browser), and the phones' own browsers, which show nothing.
const UA = {
  whatsappAndroid: 'Mozilla/5.0 (Linux; Android 13; SM-A145F Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.6668.100 Mobile Safari/537.36 WhatsApp/2.24.21.80',
  instagramIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.25.94 (iPhone14,5; iOS 17_6; en_IN)',
  facebookIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0.0.40.109]',
  chromeAndroid: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
  safariIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
};

describe('an app’s own browser', () => {
  it('is found in WhatsApp, Instagram and Facebook, with its phone', () => {
    expect(inAppBrowser(UA.whatsappAndroid)).toBe('android');
    expect(inAppBrowser(UA.instagramIos)).toBe('ios');
    expect(inAppBrowser(UA.facebookIos)).toBe('ios');
  });
  it('is not found in the phones’ own browsers', () => {
    expect(inAppBrowser(UA.chromeAndroid)).toBeUndefined();
    expect(inAppBrowser(UA.safariIos)).toBeUndefined();
  });
  it('opens the same page in the phone’s browser on Android', () => {
    expect(intentUrl(new URL('https://finance-tools-9if.pages.dev/estimate/?a=1'))).toBe('intent://finance-tools-9if.pages.dev/estimate/?a=1#Intent;scheme=https;end');
  });
});
