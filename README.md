# Folio

A folder-driven personal website for your words and pictures.

Folio is a reusable Next.js, React and TypeScript website. Keep its source code in a public repository and your complete articles and pictures in an independent local archive, anywhere on your computer.

The authorized publishing design uses private Cloudflare R2 storage for originals and release manifests, a separate media bucket served publicly through a Worker, a private GitHub manifest record, and Cloudflare Pages for the static site. **The user reports R2 is activated. Deployment is in progress; production publishing has not been confirmed.**

## Archive layout

```text
Your-Archive/                 # Separate from the Folio checkout
├── blogs/
│   └── ...                   # Articles and relative assets; currently empty
└── pictures/
    ├── games/
    │   └── Forza_Horizon_6/
    │       ├── 01.png
    │       └── 02.png
    └── photography/
        └── Hong_Kong/
            └── 01.jpg
```

Every directory containing pictures becomes an album. Nested directories supply its category path. No Markdown or metadata files are required in `pictures/`. Supported formats: PNG, JPEG, WebP and AVIF. Pictures use natural filename order; use `01`, `02`, etc. to control it. Hidden files and symbolic links are skipped. Both `blogs/` and `pictures/` remain in the full local archive; raw files from these directories do not belong in the GitHub archive repository.

## Local development

Requires Node.js 22 or later.

```bash
npm ci
cp .env.example .env.local
```

Edit `.env.local` with the absolute path to your archive:

```dotenv
FOLIO_ARCHIVE_PATH=/absolute/path/to/Your-Archive
FOLIO_SITE_TITLE=Your Name
```

```bash
npm run dev
```

The development command synchronizes the archive and watches `blogs/` and `pictures/`. After synchronization, refresh the page to see changes. Folder changes are not published automatically from your computer. If you rename the Folio checkout, restart the development server; your absolute archive path remains valid.

## Current functionality

- Large image viewer, album selector, previous/next controls and counters.
- Automatic colors from each picture, with smooth transitions.
- File additions, deletions and renames reflected in generated data.
- Private archive paths, palette caches and generated media excluded from Git.
- Empty-state page when no archive is configured, suitable for a public template.

Articles and their relative assets belong together under `blogs/`, which is currently empty. **The current UI is the image gallery; article pages are not implemented.**

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Synchronize, watch the archive, and start Next.js |
| `npm run sync` | Synchronize once without starting a server |
| `npm run lint` | Check source code |
| `npm test` | Test archive synchronization using isolated fixtures |
| `npm run build` | Synchronize and statically export to `out/` |
| `npm run publish` | Publish originals and manifests using local Wrangler OAuth, record the manifest in GitHub, and trigger the revision-specific build; deployment integration is in progress |

`.folio/` contains generated album data and a palette cache. `public/media/` contains disposable local serving copies. Source files stay in the independent archive. The current local sync copies originals unchanged; the publishing design moves bounded WebP generation and palette analysis to cloud CI. Run heavy builds and validation in authorized cloud CI.

## Publishing

Once first-time setup and deployment integration are complete, normal publication from the Folio checkout is:

```bash
npm run publish
```

The command scans only allowed archive files, hashes their content, and uses existing **Wrangler OAuth credentials with Cloudflare REST uploads** to incrementally upload missing immutable originals to the private R2 source bucket. It uploads `releases/<revision>.json` and the `latest.json` pointer there, records `release.json` in private GitHub repository `Aries-Archive`, then invokes `gh workflow run deploy.yml -f revision=<hash>` against `FOLIO_WEBSITE_REPOSITORY`. `Aries-Archive` contains only the manifest plus `README.md` and `.gitignore`, excluding raw `blogs/` and `pictures/`.

Two small Workers separate public access from build access:

- `folio-media` binds only the `MEDIA` bucket and serves public images read-only through its `workers.dev` endpoint. The account has no custom domains; this design does not use `r2.dev`.
- `folio-build` binds both buckets and requires the generated `FOLIO_STORAGE_TOKEN` on every request. It permits source `GET`/`HEAD` and media `GET`/`HEAD`/`PUT` only, with no `DELETE`.

CI uses `FOLIO_BUILD_URL` and the secret `FOLIO_STORAGE_TOKEN` to read the revision's manifest directly from R2 and download only listed originals. It needs no private GitHub archive checkout or archive token. In the cloud it generates bounded WebP variants and palettes, uploads derivatives through the protected build Worker, then builds the static Next.js site and deploys it to Pages. The existing `CLOUDFLARE_API_TOKEN` is used only for Pages deployment.

See [first-time setup and credentials](docs/deployment.md) and the [documentation index](docs/README.md). Content hashes and immutable revision manifests prevent mixed releases; `latest.json` is a mutable convenience pointer, not the revision selected for a publish-triggered build. Normal publication does not delete remote objects.

Originals remain private, while web images are public through `folio-media`. Removing an image from a later release does not revoke its existing public URL. Moving files out of a previously public Git repository does not remove them from its history. A completely free deployment is not guaranteed; storage, Workers, CI and hosting remain subject to service quotas and billing.
