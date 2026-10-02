# Open and install

End users open the hosted HTTPS link. They do not need Python, Node, or a terminal. The Python server remains an optional developer/local-testing route.

## Samsung and other Android devices

Open the link in a current Chrome or Samsung Internet browser. Tap **Install app** if offered. Otherwise open the browser menu and choose **Install app** or **Add to Home screen**, depending on browser and version. Launch Vault from its icon afterward.

## iPhone and iPad

Open the link in Safari. Tap Share, or the browser menu and then Share. Choose **Add to Home Screen**, enable **Open as Web App** if that option appears, and tap Add. Open the new icon. The in-app Install/help button includes these instructions because iOS does not use Chromium's automatic install prompt.

## Desktop

Chrome and Edge can install from the in-app button or their address-bar install icon. Supported Safari versions on macOS offer **Add to Dock**. The website also works without installation.

## Offline and updates

Wait until the header shows **Ready for offline use** before relying on offline access. The service worker stores only the exact shipped HTML, CSS, JavaScript, manifest, and icon files. It never caches vault files, forms, clipboard contents, or exported JSON. Failed or redirected asset requests abort the offline installation rather than caching a sign-in page as the app.

A new application version waits instead of automatically reloading an unlocked session. Use **Update app** after saving and locking. Export a backup before updating. Offline support is per installed browser profile/device and depends on the browser retaining its storage.

## Moving between devices

Export your encrypted JSON on the first device. Transfer that file through a method you trust, then import it on the next device with the same master passphrase. Mobile export uses the native share sheet when supported, with a regular download fallback. Choose Save to Files or a download location to retain a backup.

Installing the website does not synchronize vaults. A browser tab and an installed app may have separate storage, especially on Apple devices. If a new installation starts empty, import the encrypted backup. Different devices and separately installed copies can diverge; the app does not merge them automatically.

## Themes

Auto follows the operating system's light/dark preference and responds when that preference changes. Light, Dark, Cyberpunk, and Forest can also be selected explicitly. Preferences are nonsensitive and saved separately from the encrypted vault.

Cyberpunk uses midnight navy surfaces, purple headings, pink accents, and restrained glow. Visual reference: [cyberpunk-ui](https://github.com/laddtnov/cyberpunk-ui). Its code and dependencies are not included. Normal body text remains readable; moving/glitch effects are intentionally absent.

## Host from GitHub

In JoeReign/Self-Hosted-Password-Manager, application source lives in `vault-v2/`. The root `.github/workflows/pages.yml` builds, tests, and deploys `vault-v2/dist` from the main branch. See the repository's `GITHUB_PAGES_SETUP.md` for browser-only upload instructions.

1. Open repository **Settings → Pages**.
2. Select **GitHub Actions** as the publishing source.
3. Run **Publish Vault** from the Actions tab, or push to main.
4. Use the URL reported by the completed deployment.

Vite uses relative asset paths, and the service worker scopes itself to the app's deployment folder. Browser databases and writer locks are also separated by deployment path. The supplied workflow already sets its working directory, npm cache path, and artifact path for the `vault-v2/` folder. The deployed app still opens at the repository's Pages root URL.

GitHub Pages does not apply the localhost server's custom response headers. The built page carries its own CSP, but a static host capable of response headers offers stronger framing controls. Never place vault files or real credentials in the repository.

Sources: [Apple's iPad installation instructions](https://support.apple.com/en-gb/guide/ipad/ipad8f1f7a29/ipados), [web.dev installation](https://web.dev/learn/pwa/installation), and [GitHub custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
