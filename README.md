# Folio

A folder-driven personal website for your pictures and words, built with Next.js, React and TypeScript.

Keep the reusable website code in one repository and your complete archive in an independent local directory. Private R2 storage holds originals; cloud CI generates web images and deploys the static site to Cloudflare Pages. A private GitHub repository records release metadata only.

## Archive layout

```text
Your-Archive/                 # Outside the Folio checkout
├── blogs/                    # Articles and relative assets
└── pictures/
    ├── photography/
    │   └── trip/
    │       ├── 01.jpg
    │       └── 02.jpg
    └── screenshots/
        └── project/
            └── 01.png
```

Each directory containing pictures becomes an album; parent directories supply its category path. PNG, JPEG, WebP and AVIF are supported. Pictures use natural filename order, so `01`, `02`, etc. control their sequence. Hidden files and symbolic links are skipped. No hand-written album metadata is required.

The UI provides a large image viewer, album selection, previous/next controls, counters and automatic color transitions. **Article pages are not implemented.** `blogs/` can remain empty.

## First-time setup

Requires Node.js 22+, Wrangler signed in with OAuth, and GitHub CLI signed in with `gh auth login`. Git must also be able to push to your private archive repository.

1. Install dependencies with `npm ci`, then copy `.env.example` to `.env.local`. Keep `.env.local` untracked; set the absolute archive path, repository names, bucket names, Cloudflare account, Pages project and required `FOLIO_SITE_URL` as described in [deployment setup](docs/deployment.md).
2. Initialize the independent archive as a private Git checkout. Ignore raw `blogs/` and `pictures/`; track only `README.md`, `.gitignore` and generated `release.json`. Set its `origin` to match `FOLIO_ARCHIVE_REPOSITORY`.
3. Enable R2 and prepare the Pages project and deployment credentials, then provision storage and Workers once:

```bash
node scripts/setup-cloudflare.mjs
```

The setup script configures the two buckets, Workers and GitHub build settings. Once source folders are organized, publish the complete allowed archive with one command:

```bash
npm run publish
```

The initial publish uploads all selected originals; later publishes upload only missing content. No separate manual image upload is needed.

## Daily updates and local preview

Edit the archive, finish saving files, then run `npm run publish` from the Folio checkout. It uploads originals and release manifests using local Wrangler OAuth through Cloudflare REST, commits and pushes only `release.json` to the private archive repository, enables `FOLIO_PUBLISH_ENABLED=true`, and triggers `deploy.yml` with the content-hash revision. The workflow requires no private GitHub archive checkout or archive token.

For local preview, run `npm run dev`. It synchronizes and watches the archive; refresh the page after changes. Preview does not publish. If you rename or move the Folio checkout, restart the development server. If the archive moves, update `FOLIO_ARCHIVE_PATH` and restart.

## Publishing and privacy

Both R2 buckets have direct public access disabled. `folio-media` binds only the media bucket and exposes read-only WebP images through `workers.dev`. `folio-build` binds both buckets and requires Bearer authentication on every request: source `GET`/`HEAD`, media `GET`/`HEAD`/`PUT`, and no `DELETE`.

CI reads the revision manifest directly from private R2 through `FOLIO_BUILD_URL` with secret `FOLIO_STORAGE_TOKEN`, restores only listed files and verifies checksums. In the cloud it generates palettes and WebP variants bounded to 2400 and 640 pixels on the longest side, without enlargement or original EXIF metadata. Derivatives are uploaded through the build Worker; the static site is built and deployed to Pages. `CLOUDFLARE_API_TOKEN` is used only for CI's Pages deployment.

Originals and version manifests are immutable by content hash; `releases/latest.json` is the mutable latest pointer. Publish-triggered builds use the exact revision. Normal publication never deletes remote objects. Removing a local image affects subsequent releases but does not revoke an existing public image URL.

## Commands

| Command | Purpose |
|---|---|
| `node scripts/setup-cloudflare.mjs` | First-time bucket, Worker and GitHub build configuration |
| `npm run publish` | Incremental source upload, metadata-only Git update and cloud publication |
| `npm run restore-release` | Restore manifest-listed originals with checksums; requires exported configuration and storage authentication |
| `npm run dev` | Synchronize, watch and preview locally |
| `npm run sync` | Synchronize local preview once |
| `npm run build` | Synchronize and statically export to `out/`; production runs in cloud CI |
| `npm run lint` / `npm test` | Check source / run isolated tests |

`.folio/`, `public/media/` and `.env.local` are untracked local files. Local preview uses original serving copies; production exposes only processed images. See [deployment and restore configuration](docs/deployment.md) and the [documentation index](docs/README.md).

Public derivatives are public files. Moving originals out of a public repository does not remove its Git history. R2, Workers, CI and Pages have quotas and billing conditions; a completely free deployment is not guaranteed.
