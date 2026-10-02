
/** Invoke from a user action so mobile browsers retain share-sheet permission. */
export async function exportEncryptedJson(value: unknown): Promise<void> {
  const file = new File([JSON.stringify(value, null, 2)], 'vault-data.v2.enc.json', { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({ files: [file], title: 'Encrypted vault backup' });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      // A browser may reject sharing after asynchronous encryption. Download instead.
    }
  }
  downloadJson(value);
}

function downloadJson(value: unknown): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'vault-data.v2.enc.json';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
