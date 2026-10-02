export async function registerOfflineApp(
  onUpdate: (activate: () => void) => void,
  onReady: () => void,
  onUnavailable: () => void,
): Promise<void> {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  try {
    const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL });
    let requested = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (requested) location.reload();
    });
    const offer = () => {
      const waiting = registration.waiting;
      if (waiting) onUpdate(() => {
        requested = true;
        waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
      });
    };
    offer();
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed') {
          if (navigator.serviceWorker.controller) offer();
          else onReady();
        }
      });
    });
    await navigator.serviceWorker.ready;
    onReady();
  } catch { onUnavailable(); }
}
