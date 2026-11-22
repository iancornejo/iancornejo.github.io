# iancornejo.github.io

Ian C. Cornejo's personal site, built with [Astro](https://astro.build) and deployed to GitHub Pages on every push to `main`.

## Design

The Art glass design tokens live in `src/styles/tokens.css`, with an identical copy in the [precip-science](https://github.com/iancornejo/precip-science) repo; change both together. Geom is self-hosted from `public/fonts/` (SIL Open Font License 1.1, see `public/fonts/OFL.txt`).

## Lab and Join pages

Hidden scaffolding for a future lab site (S06): `src/data/people.yaml` feeds `/lab/` and `src/data/openings.yaml` feeds `/join/`. Each page has a switch in `src/data/profile.yaml` (`lab_page`, `join_page`):

- `"off"`: not built (the default for now).
- `"preview"`: built at its address so you can check it, but left out of the menu and the sitemap and marked `noindex`.
- `"on"`: built and linked from the menu.

Openings are listed soonest deadline first and close at 11:59 PM on their deadline in `site.timezone`. A closed opening drops out at the next daily rebuild, and a small script in the page hides it in the meantime.

To see the site as it would look on another date (badges, upcoming meetings, openings), build with `SITE_NOW` set, e.g. `SITE_NOW=2027-03-01T12:00:00Z npm run build`.

## Development

```sh
npm install
npm run dev     # local preview at localhost:4321
npm run build   # production build into ./dist
```

## License

Code is MIT-licensed (see `LICENSE`). Text and figures are CC BY 4.0. Publication PDFs follow each publisher's terms. Geom is under the SIL OFL 1.1.
