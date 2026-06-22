import { api } from '../api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export const pushSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

export async function getSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  try {
    // serviceWorker.ready can hang if no SW is active yet — race with a timeout.
    const reg = await Promise.race<ServiceWorkerRegistration | null>([
      navigator.serviceWorker.ready,
      new Promise((r) => setTimeout(() => r(null), 3000)),
    ]);
    if (!reg) return null;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function enablePush(): Promise<void> {
  if (!pushSupported()) throw new Error('not-supported');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('denied');
  const { key, enabled } = await api.pushPubKey();
  if (!enabled || !key) throw new Error('server-disabled');
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
    });
  }
  await api.pushSubscribe(sub.toJSON());
  // tzOffsetMin = minutes to ADD to UTC to get local time
  await api.setSettings({ remindersEnabled: 1, tzOffsetMin: -new Date().getTimezoneOffset() });
}

export async function disablePush(): Promise<void> {
  await api.setSettings({ remindersEnabled: 0 });
  const sub = await getSubscription();
  if (sub) await api.pushUnsubscribe(sub.endpoint);
}
