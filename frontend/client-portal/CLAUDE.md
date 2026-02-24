# Client Portal — CLAUDE.md

## Non-Obvious Conventions

- **Use path aliases for all imports** — `@/` and `@shared`, never deep relative paths
- **Three layout types** — choose based on page context: `PublicLayout` (marketing), `BookingLayout` (booking flow), `ClientLayout` (authenticated area)
- **Accepts both CLIENT and ADMIN roles** — not client-only
- **AccessibilityProvider must stay in the provider hierarchy** — do not remove it
- **SEO is handled via React Router v7 `meta()` exports** on route modules, not a global provider
- **Coverage thresholds**: 80% (branches, functions, lines, statements)
