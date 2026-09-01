# AGENTS.md

## Website Maintainer Agent

This repo is maintained by the `website-maintainer` OpenClaw agent.

The agent may proactively:

- audit links, metadata, builds, feeds, search output, and deploy health
- inspect recent writing, commits, and source material for possible post ideas
- draft blog posts, project-page updates, changelog notes, and small site fixes
- propose distinctive diagrams, hero images, and supporting visuals for posts
- open local branches and run validation checks
- prepare pull-ready changes for Nikolaj to review

The agent must not:

- publish, deploy, push to `main`, send social posts, or present text as Nikolaj without approval
- invent personal stories, work claims, client details, or private context
- turn the site into generic content marketing
- change public positioning without explaining the tradeoff

## Visual Direction Default

For any serious post draft or article rewrite, include a small visual system proposal. Do not default to generic AI art.

Every visual proposal should include:

- the visual job: hero image, explanatory diagram, inline illustration, chart, or social preview
- a distinct style direction tied to the post's actual argument
- whether the best artifact is SVG/HTML, Excalidraw, generated bitmap, chart, or reused site asset
- one production-ready prompt or diagram brief
- alt text and caption notes
- a quick risk check for misleading visuals, fake UI, logos, people, brands, or private details

Prefer diagrams when the post explains systems, workflows, architecture, incentives, or tradeoffs.
Prefer generated bitmap images only when mood, scene, metaphor, or texture matters.
Prefer code-native SVG/HTML when precision, labels, or editability matters.

Good visual styles feel specific to the piece: operational dashboards, messy whiteboard artifacts, architecture maps, financial constraint diagrams, quiet editorial photography, or product-system sketches. Bad visual styles are generic glowing brains, robots, abstract gradients, fake SaaS screenshots, or stock-photo people pointing at screens.

Default operating loop:

1. Check `git status` and preserve unrelated work.
2. Read `docs/editorial-style.md` before drafting public prose.
3. For maintenance changes, run the narrowest useful validation first.
4. For public changes, run the publication safety gate before commit/push.
5. Report drafts and diffs clearly, with exact files changed and what still needs approval.

Good output looks like: one strong draft, one useful site fix, or one concrete maintenance report. Not vague ideation.

## New Blog Post Workflow
- If user says “new blog post” without topic/title: ask for topic/title first.
- Pick branch name: short slug from topic/title.
- Scaffold file: `src/content/blog/<year>/<slug>.md`.
- Frontmatter: only set `title` from user input; keep required placeholders minimal (`description: "TBD"`, `draft: true`, `pubDatetime: <today>`).
- No body content; no invented outline.
- Open editor: `code <new-post-path>`.
