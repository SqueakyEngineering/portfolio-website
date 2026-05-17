# [PLACEHOLDER: Miles Scheetz] Portfolio

Personal engineering portfolio built with Astro and Tailwind CSS. The content is intentionally marked with `[PLACEHOLDER: ...]` so it is easy to search and replace.

## Stack

- Astro 6
- Tailwind CSS 4
- Astro content collections for project case studies
- Vercel deployment with a server endpoint for dev-mode authentication

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

Run the site with `npm run dev`, then use the floating **Dev mode** button to unlock edit mode. Use the floating toolbar to turn editing on, then click outlined text to rewrite it. Changes stay staged in the page while edit mode is on, and save through the local server only when you turn edit mode off.

The password check runs through a server endpoint and the editor script is only served after authentication. The editor saves a change only when it can find one unambiguous source match; project card fields write back to the matching Markdown frontmatter. Use **Reset page** before navigating away if you want to restore the page text to the values it had when you loaded it.

## Replacing Content

Search for `[PLACEHOLDER:` across the repo and replace each item with your real bio, project details, contact links, and resume content.

Project pages are powered by Markdown files in `src/content/projects/`. Add a new `.md` file with the same frontmatter shape to create a new project route automatically.

## Deploying To Vercel

1. Push this repo to GitHub.
2. Import the GitHub repo in Vercel.
3. Use the default Astro settings:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Confirm `site` in `astro.config.mjs` matches the production URL: `https://milesscheetz.com`.
