# jsonversal-pdf

Source for **pdf.jsonversal.com** — privacy-first PDF tools that run entirely in the browser.

- Stack: static HTML/CSS/JS + pdf-lib + pdf.js + JSZip (all self-hosted in `assets/vendor/`, zero external requests)
- Hosting: Cloudflare Pages project `jsonversal-pdf`; deployed via wrangler from a local workstation (GitHub integration not wired — this repo is the source of truth)
- Tools: merge · split · rotate · organize · compress · pdf-to-jpg · jpg-to-pdf · page-numbers · extract-text
- No backend, no uploads, no trackers, no cookies

## Deploy

```bash
wrangler pages deploy . --project-name=jsonversal-pdf --branch=main
```
