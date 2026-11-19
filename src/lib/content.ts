// Loads the YAML files in src/data/, checks them, and exports typed data for the pages.
// A mistake in a YAML file (a missing title, a malformed date) stops the build with a
// message naming the file and field, so a broken edit never reaches the live site.
import { parse } from "yaml";
import { z } from "astro/zod";

import profileRaw from "../data/profile.yaml?raw";
import publicationsRaw from "../data/publications.yaml?raw";
import presentationsRaw from "../data/presentations.yaml?raw";
import datacodeRaw from "../data/datacode.yaml?raw";
import cvRaw from "../data/cv.yaml?raw";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD");
const text = z.string().trim().min(1);
const link = z.object({ label: text, url: z.url() });

const Profile = z.object({
  name: text,
  short_name: text,
  eyebrow: text,
  position: text,
  institution: text,
  location: text,
  office: text,
  email: z.object({ user: text, domain: text }),
  orcid: text,
  github: text,
  lead: text,
  interests: z.array(z.object({ title: text, text })),
  site: z.object({
    cloudflare_analytics_token: z.string().default(""),
    new_badge_days: z.number().int().positive().default(120),
  }),
});

const Publication = z.object({
  id: text,
  status: z.enum(["published", "accepted", "in-revision", "in-review"]),
  year: z.number().int().optional(),
  authors: z.array(text).min(1),
  title: text,
  journal: text,
  journal_short: text.optional(),
  volume: z.union([z.number(), z.string()]).optional(),
  issue: z.union([z.number(), z.string()]).optional(),
  pages: z.union([z.number(), z.string()]).optional(),
  doi: text.optional(),
  added: date.optional(),
  figure: z
    .object({ file: text, alt: text, caption: text.optional(), credit: text.optional() })
    .optional(),
  summary: text.optional(),
  links: z.array(link).default([]),
});

const Presentation = z.object({
  id: text,
  meeting: text,
  location: z.string().optional(),
  year: z.number().int(),
  ends: date.optional(),
  type: z.enum(["talk", "poster", "invited", ""]).default(""),
  title: text,
  authors: z.array(text).min(1),
  award: z.string().optional(),
  poster: z.object({ pdf: text, image: text.optional() }).optional(),
});

const DataCode = z.object({
  software: z.array(
    z.object({
      id: text,
      name: text,
      short: z.string().optional(),
      added: date.optional(),
      summary: text,
      license: z.string().optional(),
      doi: z.string().optional(),
      credit: z.string().optional(),
      reference_doi: z.string().optional(),
      links: z.array(link).default([]),
    }),
  ),
  datasets: z.array(
    z.object({
      id: text,
      title: text,
      authors: z.array(text).min(1),
      year: z.number().int(),
      version: z.string().optional(),
      publisher: text,
      doi: text,
      added: date.optional(),
      summary: z.string().optional(),
    }),
  ),
});

const CV = z.object({
  education: z.array(
    z.object({ degree: text, institution: text, year: z.number().int(), thesis: z.string().optional() }),
  ),
  appointments: z.array(z.object({ title: text, institution: text, dates: z.coerce.string() })),
  funding: z.array(
    z.object({ title: text, sponsor: text, award: z.string().optional(), dates: z.coerce.string() }),
  ),
  awards: z.array(z.object({ name: text, org: z.string().optional(), year: z.number().int() })),
  fieldwork: z.array(
    z.object({ campaign: text, place: z.string().optional(), role: text, dates: z.coerce.string() }),
  ),
  teaching: z.array(z.object({ role: text, institution: text, dates: z.coerce.string() })),
  mentoring: z.array(text).default([]),
  service: z.array(text).default([]),
  skills: z.array(z.object({ label: text, items: text })).default([]),
});

function load<T extends z.ZodType>(schema: T, raw: string, file: string): z.infer<T> {
  const result = schema.safeParse(parse(raw));
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(top level)"}: ${i.message}`)
      .join("\n");
    throw new Error(`src/data/${file} has a problem:\n${issues}`);
  }
  return result.data;
}

export const profile = load(Profile, profileRaw, "profile.yaml");
export const publications = load(z.array(Publication), publicationsRaw, "publications.yaml");
export const presentations = load(z.array(Presentation), presentationsRaw, "presentations.yaml");
export const datacode = load(DataCode, datacodeRaw, "datacode.yaml");
export const cv = load(CV, cvRaw, "cv.yaml");

export type PublicationT = z.infer<typeof Publication>;
export type PresentationT = z.infer<typeof Presentation>;

// ---------- helpers ----------

export const ME = "I. C. Cornejo";
const DAY = 86_400_000;

/** Build time; a small script in the page hides badges that expire between builds. */
export const buildTime = new Date();

/** Date (YYYY-MM-DD) when a "New!" badge for `added` expires, or null if it already has. */
export function newUntil(added?: string): string | null {
  if (!added) return null;
  const until = new Date(Date.parse(added + "T00:00:00Z") + profile.site.new_badge_days * DAY);
  return until.getTime() > buildTime.getTime() ? until.toISOString().slice(0, 10) : null;
}

/** True while a meeting hasn't ended yet. */
export function isUpcoming(ends?: string): boolean {
  return !!ends && Date.parse(ends + "T23:59:59Z") > buildTime.getTime();
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** AMS-style author list ("Cornejo, I. C., A. K. Rowe, and M. M. Bell") as HTML, with Ian in bold. */
export function authorsHtml(authors: string[]): string {
  const names = authors.map((a, i) => {
    let shown = a;
    if (i === 0) {
      const cut = a.lastIndexOf(" ");
      shown = cut > 0 ? `${a.slice(cut + 1)}, ${a.slice(0, cut)}` : a;
    }
    const safe = escapeHtml(shown);
    return a === ME ? `<strong>${safe}</strong>` : safe;
  });
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]}, and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
}

/** Journal details after the title: "Mon. Wea. Rev., 152(2), 531–551". */
export function journalDetails(p: PublicationT): string {
  let out = "";
  if (p.volume !== undefined) out += `, ${p.volume}`;
  if (p.issue !== undefined) out += `(${p.issue})`;
  if (p.pages !== undefined) out += `, ${p.pages}`;
  return out;
}

export const statusLabel: Record<PublicationT["status"], string> = {
  published: "",
  accepted: "Accepted",
  "in-revision": "In revision",
  "in-review": "In review",
};

export const typeLabel: Record<PresentationT["type"], string> = {
  talk: "Talk",
  poster: "Poster",
  invited: "Invited talk",
  "": "",
};

/** Presentations grouped by meeting and year, keeping file order (newest first). */
export function groupPresentations(list: PresentationT[]) {
  const groups: { key: string; meeting: string; location?: string; year: number; ends?: string; items: PresentationT[] }[] = [];
  for (const p of list) {
    const key = `${p.meeting}|${p.year}`;
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, meeting: p.meeting, location: p.location, year: p.year, ends: p.ends, items: [] };
      groups.push(g);
    }
    g.items.push(p);
    g.ends ??= p.ends;
  }
  return groups;
}

/** Presentation awards, for the CV's Awards list. */
export function presentationAwards() {
  return presentations
    .filter((p) => p.award)
    .map((p) => ({ name: p.award!, org: p.meeting, year: p.year }));
}
