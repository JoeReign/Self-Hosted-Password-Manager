# Publish the new Vault with GitHub Pages

The new application source is in `vault-v2/`. The existing `Vault/Vault.html` is unchanged. The updated root `README.md` includes the app link and user instructions. The root `.github/workflows/pages.yml` tests and builds the new application, then publishes only its static build.

## One-time repository setup

1. Extract the ZIP, then open [JoeReign/Self-Hosted-Password-Manager](https://github.com/JoeReign/Self-Hosted-Password-Manager) on `main`.
2. Choose **Add file → Upload files**. Drag in `vault-v2`, `.github`, `README.md`, and this guide from inside the extracted folder. Preserve the folder names; do not upload the ZIP or nest everything inside another folder.
3. Commit to `main`, or merge the upload branch into `main`.
4. Open repository Settings → Pages.
5. Choose GitHub Actions as the publishing source.
6. Open Actions → Publish Vault → Run workflow if the push has not already triggered it.
7. After deployment succeeds, open the URL shown in the deployment or Settings → Pages.

For JoeReign/Self-Hosted-Password-Manager, the standard project-site address would be `https://joereign.github.io/Self-Hosted-Password-Manager/`. This is the expected address, not a claim that deployment has completed; a custom domain or existing Pages configuration can change it.

End users open the resulting HTTPS URL and use Install/help. No terminal, Python, or GitHub login is needed for a publicly hosted app. Phones use the same URL and can add it to their home screen. Existing encrypted and supported plaintext JSON files remain importable.

The site code is public; each visitor's vault stays in their own browser's encrypted storage. Never commit vault JSON files or real credentials. Export an encrypted backup before moving from another site: different origins have separate browser storage. Device-to-device sync remains manual.

If GitHub approval is required for a first workflow run, approve it in Actions. If the existing Pages configuration serves another website, review that configuration before replacing its deployment. No GitHub repository, settings, or live deployment have been changed by preparing this package.

If `.github` is hidden in your file picker, choose **Add file → Create new file**, use `.github/workflows/pages.yml` as its name, and paste that file's contents from the extracted package. The workflow must be at the repository root; placing it under `vault-v2` will not register it as an Actions workflow.

See [GitHub's upload instructions](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository) and [Pages source configuration](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Updating an already deployed app

Extract the latest package. In the repository root, choose **Add file → Upload files** and drag in `vault-v2`, `README.md`, and `GITHUB_PAGES_SETUP.md`. Commit to `main`. Keep the existing `.github/workflows/pages.yml`; it does not need to be recreated for this update. Wait for **Actions → Publish Vault** to finish both build and deployment. Then open the app, save and lock the vault, and choose **Update app** when offered (or refresh to check for the update). The icon on an existing home-screen shortcut may take longer to refresh depending on the operating system; a newly added shortcut uses the new icon. Export a backup before removing an installed app or clearing browser data.

This update adds English/Arabic switching, right-to-left Arabic layout, and the purple/pink lock icon. The old JSON import formats and encrypted storage remain compatible.
