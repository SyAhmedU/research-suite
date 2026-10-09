# Latest-data controls

`node tools/refresh/install.mjs` installs the canonical dependency-free, isolated Shadow DOM panel in 15 research projects and the Journal Explorer subpage (16 entry points). Copies are local to each deployment; no shared runtime dependency.

- Fetch named published references using `no-store`, a cache-busting query and timeouts; distinguish checked-at from source date.
- Detect content changes using SHA-256 when available. JSON validation rejects SPA HTML fallbacks. Keep prior successful evidence on failures.
- Download the fetched reference copy; do not overwrite in-progress datasets, selected scales, drafts, projects or answers. In-memory app catalogues are intentionally unchanged.
- Fetch up to 12 real Crossref journal-article records by topic, through today's publication date; preserve previous results on failure and export exact provider metadata.
- Check only the current app's service worker. Never clear any caches/localStorage, reload the page, regenerate AI outputs, or claim a bulk refresh.
- `researchdata:reference` announces source check metadata only. It does not mean a host app has applied a new reference version.

The source pipeline, curated facts, Scopus status/coverage, editorial policies and deadlines remain separate reviewed updates. ResearchFlow backend grounding has its own 24-hour cache; checking references here does not invalidate it.

Update `install.mjs` for source mappings, and the canonical JS for behavior. Reinstall, check syntax, and deploy each consuming project. Service workers bypass `research_refresh` and `cache: no-store` so failures cannot masquerade as a successful fresh check.
