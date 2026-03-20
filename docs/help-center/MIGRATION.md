# Help Center Migration Guide: GitBook

This guide covers migrating the `docs/help-center/` content to GitBook for a hosted, searchable knowledge base.

## Why GitBook

- Native markdown import — all 52 articles import directly
- Custom domain support (e.g., `help.lifeplace.ph`)
- AI-powered search for staff
- Unlimited readers at no extra cost
- Git sync — changes pushed to the repo auto-deploy to GitBook
- Collections map 1:1 to the existing directory structure

## Pricing

GitBook Premium: $65/month + $12/user/month for editors (readers are free).

## Setup Steps

### 1. Create a GitBook Account

1. Go to [gitbook.com](https://www.gitbook.com) and sign up
2. Create an organization (e.g., "LifePlace")
3. Select the Premium plan

### 2. Create a New Site

1. In GitBook, create a new site named "LifePlace Help Center"
2. Choose "Import" as the starting method
3. Select "Git Sync" to connect to your GitHub repository

### 3. Configure Git Sync

1. Connect your GitHub account
2. Select the `lifeplace` repository
3. Set the content directory to `docs/help-center`
4. Set the branch to `main`
5. Enable bi-directional sync (changes in GitBook push back to the repo)

### 4. Configure Custom Domain

1. In Site Settings > Custom Domain, enter your subdomain (e.g., `help.lifeplace.ph`)
2. Add the required DNS records:
   - CNAME record: `help` pointing to `hosting.gitbook.io`
3. Wait for SSL certificate provisioning (automatic)

### 5. Organize Collections

GitBook should auto-detect the directory structure. Verify these collections exist:

| Collection | Directory |
|---|---|
| Getting Started | `getting-started/` |
| Clients | `clients/` |
| Events | `events/` |
| Calendar & Tasks | `calendar-and-tasks/` |
| Quotes & Pricing | `quotes/` |
| Contracts | `contracts/` |
| Payments & Invoices | `payments/` |
| Communications | `communications/` |
| Notifications | `notifications/` |
| Analytics & Metrics | `analytics/` |
| Settings | `settings/` |
| Client Portal | `client-portal/` |
| Booking Lifecycle | `booking-lifecycle/` |
| Workflows & Automation | `workflows/` |
| Admin Permissions | `admin-permissions/` |
| Reference | `reference/` |

### 6. Configure Site Settings

- **Title:** LifePlace Help Center
- **Logo:** Upload company logo
- **Favicon:** Upload favicon
- **Theme:** Match LifePlace brand colors
- **Footer:** Add company name and contact info
- **SEO:** Set meta descriptions for the main index page

### 7. Enable AI Search

1. In Site Settings > Integrations, enable GitBook AI
2. This provides AI-powered search that answers staff questions by referencing the articles

### 8. Restrict Access (Optional)

If the help center should be staff-only:

1. In Site Settings > Visitor Authentication, enable authentication
2. Choose an auth method (password, SSO, or link-based)
3. This requires the Ultimate plan ($249/mo) for full visitor auth

For a simpler approach on Premium: keep the site unlisted (not indexed by search engines) and share the URL only with staff.

### 9. Test

1. Verify all articles render correctly
2. Test search functionality
3. Test navigation between collections
4. Verify links between articles work
5. Test on mobile

## Ongoing Maintenance

- **Adding articles:** Create a new `.md` file in the appropriate `docs/help-center/` subdirectory, add it to the collection `index.md`, commit and push. Git sync deploys automatically.
- **Editing articles:** Edit the markdown file, commit and push. Or edit directly in GitBook's web editor (syncs back to the repo).
- **Removing articles:** Delete the file, remove from the collection index, commit and push.

## Alternative: Intercom

If you later want the full support suite (messenger, inbox, ticketing, AI chatbot) in addition to the knowledge base, Intercom is the upgrade path. StudioNinja's Ninja Academy uses Intercom.

- Intercom Essential: $29/seat/month
- Import: Manually create articles in Intercom's editor (no bulk markdown import)
- Collections map to Intercom's "Collections" feature
- Adds: in-app messenger, Fin AI Agent, ticketing, proactive support
