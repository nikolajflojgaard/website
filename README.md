# Nikolaj Fløjgaard's Personal Website

This is the source code for my personal website, built with [Astro](https://astro.build).

🔗 **Live site**: https://nikolajflojgaard.com

## About

I'm Nikolaj Fløjgaard — Senior Integration Architect at TDC NET, builder of agentic workflows, and explorer of LLMs.

This website hosts my blog posts (auto-imported from LinkedIn), GitHub activity, and information about my work.

---

## 🔄 Content Workflow

Sådan kommer nyt content fra LinkedIn ud på sitet:

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌─────────────┐
│  LinkedIn   │────▶│  GitHub Repo │────▶│    Build    │────▶│   Simply    │
│   Post      │     │  linkedin_   │     │    Astro    │     │   Hosting   │
│             │     │   urls.txt   │     │             │     │             │
└─────────────┘     └──────────────┘     └─────────────┘     └─────────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │  GitHub Actions  │
                   │  (3 workflows)   │
                   └──────────────────┘
```

### Workflow Steps

1. **Tilføj URL** → Skriv LinkedIn post URL i `data/linkedin_urls.txt`
2. **Push til GitHub** → Commit og push ændringen
3. **LinkedIn Sync** → GitHub Action henter post content og opretter Markdown fil i `src/content/blog/`
4. **GitHub Sync** → (auto hver 6. time) Henter repo stats og activity
5. **Deploy** → GitHub Action bygger og uploader til Simply via FTPS

---

## 🚀 Quick Start: Tilføj ny LinkedIn Post

```bash
# 1. Tilføj URL til filen
echo "https://www.linkedin.com/feed/update/urn:li:activity:XXXXXXXX/" >> data/linkedin_urls.txt

# 2. Commit og push
git add data/linkedin_urls.txt
git commit -m "Add new LinkedIn post"
git push origin main

# 3. Trig workflows på GitHub (eller vent til de kører automatisk)
#    - LinkedIn Sync: https://github.com/nikolajflojgaard/website/actions/workflows/linkedin-sync.yml
#    - Deploy: https://github.com/nikolajflojgaard/website/actions/workflows/simply-deploy.yml
```

---

## 🏗️ Project Structure

```text
├── public/                  # Static assets (images, fonts, favicon)
│   ├── assets/             # Images for blog posts
│   └── fonts/              # Web fonts
├── src/
│   ├── assets/             # Icons and images used in components
│   ├── components/         # Reusable UI components
│   │   └── ui/             # React components
│   ├── content/            # Content collections
│   │   └── blog/           # Blog posts in Markdown format (organized by year)
│   ├── layouts/            # Page layouts and templates
│   ├── pages/              # Routes and pages
│   ├── styles/             # Global styles and CSS
│   └── utils/              # Utility functions
├── data/                   # Data files
│   ├── linkedin_urls.txt   # Liste over LinkedIn posts der skal importeres
│   ├── linkedin_state.json # State for sync (auto-genereret)
│   └── github_data.json    # GitHub stats (auto-genereret)
├── scripts/                # Build/sync scripts
│   ├── linkedin_sync.mjs   # Henter LinkedIn posts
│   └── github_sync.mjs     # Henter GitHub data
├── .github/workflows/      # GitHub Actions
│   ├── linkedin-sync.yml   # Importerer LinkedIn posts → blog
│   ├── github-sync.yml     # Henter GitHub data (hver 6. time)
│   └── simply-deploy.yml   # Deploy til Simply hosting
├── astro.config.mjs        # Astro configuration
└── package.json            # Project dependencies
```

---

## 🛠️ Commands

| Command                | Action                                      |
| :--------------------- | :------------------------------------------ |
| `npm install`          | Installs dependencies                       |
| `npm run dev`          | Starts local dev server at `localhost:4321` |
| `npm run build`        | Build the production site to `./dist/`      |
| `npm run preview`      | Preview the build locally, before deploying |

---

## 🌐 Deployment

### Simply.com (Production)

Deploy sker automatisk via GitHub Actions:
- **Trigger**: Push til `main` branch eller manuel kørsel
- **Build**: `npm run build` → `./dist/`
- **Upload**: FTPS til Simply hosting

**Manuel trigger**: https://github.com/nikolajflojgaard/website/actions/workflows/simply-deploy.yml

### Lokalt Build (hvis nødvendigt)

```bash
npm run build
# Upload indholdet af `dist/` til webroot (fx `public_html/`)
```

---

## 🔧 GitHub Actions Workflows

| Workflow | Trigger | Hvad den gør |
|----------|---------|--------------|
| **LinkedIn Sync** | Manual, Schedule (daglig) | Importerer LinkedIn posts til blog |
| **GitHub Sync** | Schedule (hver 6. time) | Henter repo stats og activity |
| **Simply Deploy** | Push til main, Manual | Bygger og deployer til Simply |

### Required Secrets (GitHub Settings → Secrets)

- `SIMPLY_SFTP_HOST` — FTP server hostname
- `SIMPLY_SFTP_USER` — FTP brugernavn
- `SIMPLY_SFTP_PASS` — FTP password
- `SIMPLY_SFTP_PORT` — FTP port (typisk 21)
- `SIMPLY_REMOTE_DIR` — Fjern mappe (typisk `public_html`)
- `GITHUB_TOKEN` — For GitHub API kald (optional, auto-genereret)

---

## 📄 License

This repository uses dual licensing:

- **Documentation & Blog Posts**: Licensed under [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/)
- **Code & Code Snippets**: Licensed under the [MIT License](LICENSE)

---

## 💡 Tips

- LinkedIn posts hentes automatisk — du skal kun tilføje URL'en
- GitHub data opdateres hver 6. time automatisk
- Deploy kører automatisk ved push til main
- Brug `npm run dev` til at teste lokalt før deploy
