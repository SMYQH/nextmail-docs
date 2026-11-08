# ego-lite homepage smoke test

This test drives the built documentation site in the installed ego-lite browser.
Build and serve both locales first:

```powershell
npm run build -- --no-minify
npm run serve -- --host 127.0.0.1 --port 3004
```

In a second PowerShell window, run:

```powershell
$docsPath = (Resolve-Path .).Path.Replace('\', '/')
ego-browser nodejs -e "await import('file:///$($docsPath)/tests/ego-lite/homepage.smoke.mjs')"
```

The test checks localized homepage content and CTA targets, the loaded preview
image, search, theme switching, the deployment verification section, and mobile
horizontal overflow and first-screen content. It starts one ego-lite TaskSpace
per run and closes it after a passing run. To use another server address, update
the `baseUrl` constant at the top of `homepage.smoke.mjs`.
