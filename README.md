# [PLACEHOLDER: Miles Scheetz] Portfolio

Personal engineering portfolio built with Astro and Tailwind CSS. The content is intentionally marked with `[PLACEHOLDER: ...]` so it is easy to search and replace.

## Stack

- Astro 6
- Tailwind CSS 4
- Astro content collections for project case studies
- Static deployment target for Vercel

## Project Structure

```text
src/
  components/        Shared Astro components
  content/projects/  Markdown project case studies
  layouts/           Shared SEO/layout shell
  pages/             Route files
public/
  images/            Static image assets
  resume.pdf         Replace with your real resume PDF
```

## Commands

```sh
npm install
npm run dev
npm run build
npm run preview
```

## Replacing Content

Search for `[PLACEHOLDER:` across the repo and replace each item with your real bio, project details, contact links, and resume content.

Project pages are powered by Markdown files in `src/content/projects/`. Add a new `.md` file with the same frontmatter shape to create a new project route automatically.

## Deploying To Vercel

1. Push this repo to GitHub.
2. Import the GitHub repo in Vercel.
3. Use the default Astro settings:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Update `site` in `astro.config.mjs` after Vercel gives you the production URL.
