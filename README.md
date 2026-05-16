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
  resume.pdf         Generated copy served by the site
```

## Commands

```sh
npm install
npm run dev
npm run resume:pdf
npm run build
npm run preview
```

## Resume PDF

Edit `Resume-Miles Scheetz.tex` as the source resume. To compile it locally and update the PDF served by the site, run:

```powershell
npm run resume:pdf
```

LaTeX Workshop and the script compile the source into `build/Resume-Miles Scheetz.pdf`, then copy that generated PDF to `public/resume.pdf` so the website can display and download it at the stable URL `/resume.pdf`. If `pdflatex` is not available, install MiKTeX and restart your terminal:

```powershell
winget install MiKTeX.MiKTeX
```

## Dev Editing

Run the site locally with `npm run dev`, then open `http://localhost:4321/?edit=1` to turn on edit mode. Click outlined text to rewrite it; changes autosave to browser `localStorage` and persist across reloads and new windows for the same local URL.

Use the floating toolbar to turn editing off, reset the current page, or clear all local edits. Add `?edit=0` to the URL if you want to force edit mode off.

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
