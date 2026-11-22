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
import peopleRaw from "../data/people.yaml?raw";
import openingsRaw from "../data/openings.yaml?raw";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD");
const text = z.string().trim().min(1);
const link = z.object({ label: text, url: z.url() });

/** "off": the page isn't built. "preview": built but hidden (no menu link, not in the sitemap,
 *  marked noindex). "on": built and linked from the menu. */
const PageMode = z.enum(["off", "preview", "on"]).default("off");
const timeZone = z.string().refine((tz) => {
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch { return false; }
}, "use a time zone name such as America/Denver");

const Profile = z.object({
  name: text,
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
    lab_page: PageMode,
    join_page: PageMode,
    timezone: timeZone.default("America/Denver"),
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
  poster: z
    .object({ pdf: text.optional(), url: z.url().optional(), image: text.optional() })
    .refine((p) => p.pdf || p.url, "give a pdf (in public/posters/) or a url")
    .optional(),
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
    z.object({
      degree: text,
      institution: text,
      year: z.number().int(),
      thesis: z.object({ kind: text, title: text, url: z.url().optional() }).optional(),
    }),
  ),
  appointments: z.array(z.object({ title: text, institution: text, dates: z.coerce.string() })),
  funding: z.array(
    z.object({ title: text, sponsor: text, award: z.string().optional(), dates: z.coerce.string() }),
  ),
  awards: z.array(z.object({ name: text, org: z.string().optional(), year: z.number().int() })),
  fieldwork: z.array(
    z.object({ campaign: text, place: z.string().optional(), role: text, dates: z.coerce.string() }),
  ),
  workshops: z
    .array(z.object({ name: text, place: z.string().optional(), dates: z.coerce.string() }))
    .default([]),
  teaching: z.array(z.object({ role: text, institution: text, dates: z.coerce.string() })),
  mentoring: z.array(text).default([]),
  service: z.array(z.object({ group: text, items: z.array(text) })).default([]),
  skills: z.array(z.object({ label: text, items: text })).default([]),
});

// A list left empty in the file (only comments under it) reads as null: treat it as [].
const list = <T extends z.ZodType>(item: T) => z.array(item).nullable().transform((v) => v ?? []);

const roles = ["postdoc", "phd", "ms", "undergrad", "staff", "visitor"] as const;
const Person = z.object({
  name: text,
  role: z.enum(roles),
  since: z.number().int(),
  until: z.number().int().optional(),
  now: z.string().optional(),
  photo: z.string().optional(),
  summary: z.string().optional(),
  links: z.array(link).default([]),
});
const People = z.object({ intro: z.string().default(""), people: list(Person) });

const Opening = z.object({
  id: text,
  title: text,
  kind: z.enum(["postdoc", "phd", "ms", "undergrad", "other"]),
  posted: date,
  deadline: date.optional(),
  start: z.string().optional(),
  summary: text,
  apply: z.object({ label: text.default("How to apply"), url: z.string().regex(/^(https?:|mailto:)/, "use a web address or a mailto: link") }).optional(),
});
const Openings = z.object({ intro: z.string().default(""), none: text, openings: list(Opening) });

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
export const lab = load(People, peopleRaw, "people.yaml");
export const jobs = load(Openings, openingsRaw, "openings.yaml");

const ids = jobs.openings.map((o) => o.id);
const dup = ids.find((id, i) => ids.indexOf(id) !== i);
if (dup) throw new Error(`src/data/openings.yaml has a problem:\n  - two openings share the id "${dup}"`);

export type PublicationT = z.infer<typeof Publication>;
export type PresentationT = z.infer<typeof Presentation>;
export type PersonT = z.infer<typeof Person>;
export type OpeningT = z.infer<typeof Opening>;

// ---------- helpers ----------

export const ME = "I. C. Cornejo";
const DAY = 86_400_000;

/**
 * Build time; a small script in the page hides badges and openings that expire between builds.
 * To check how the site looks on another date, build with SITE_NOW set, e.g.
 * SITE_NOW=2027-03-01T12:00:00Z npm run build
 */
export const buildTime = (() => {
  const forced = process.env.SITE_NOW;
  if (!forced) return new Date();
  const t = new Date(forced);
  if (Number.isNaN(t.getTime())) throw new Error(`SITE_NOW="${forced}" is not a date`);
  return t;
})();

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

// ---------- Lab and Join pages ----------

export const roleLabel: Record<PersonT["role"], string> = {
  postdoc: "Postdoctoral researcher",
  phd: "PhD student",
  ms: "MS student",
  undergrad: "Undergraduate researcher",
  staff: "Staff",
  visitor: "Visitor",
};
export const kindLabel: Record<OpeningT["kind"], string> = {
  postdoc: "Postdoc",
  phd: "PhD",
  ms: "MS",
  undergrad: "Undergraduate",
  other: "Position",
};

/** Current members in role order, then alumni (newest first). */
export function labPeople() {
  const current = lab.people.filter((p) => p.until === undefined || p.until >= buildTime.getUTCFullYear());
  const alumni = lab.people.filter((p) => !current.includes(p)).sort((a, b) => b.until! - a.until!);
  current.sort((a, b) => roles.indexOf(a.role) - roles.indexOf(b.role) || a.since - b.since);
  return { current, alumni };
}

/** Minutes east of UTC for a time zone at an instant (e.g. -420 for Denver in winter). */
function offsetMinutes(t: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(t);
  const get = (k: string) => Number(parts.find((p) => p.type === k)!.value);
  return (Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")) - t) / 60_000;
}

/** The instant an opening closes: 11:59:59 PM on its deadline, in the site's time zone. */
export function closesAt(deadline: string, tz = profile.site.timezone): Date {
  const [y, m, d] = deadline.split("-").map(Number);
  const local = Date.UTC(y, m - 1, d, 23, 59, 59);   // the wall-clock time, read as if it were UTC
  let t = local - offsetMinutes(local, tz) * 60_000;   // first guess at the instant
  t = local - offsetMinutes(t, tz) * 60_000;           // refine with the offset at that instant (DST-safe)
  return new Date(t);
}

/** Openings still open at build time: soonest deadline first, "open until filled" last. */
export function openOpenings(): OpeningT[] {
  const due = (o: OpeningT) => (o.deadline ? closesAt(o.deadline).getTime() : Infinity);
  return jobs.openings.filter((o) => due(o) > buildTime.getTime()).sort((a, b) => due(a) - due(b));
}

/** "February 15, 2027" for a YYYY-MM-DD date. */
export function longDate(d: string): string {
  return new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

/** "Mountain Time" for America/Denver. */
export function zoneName(tz = profile.site.timezone): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longGeneric" })
    .formatToParts(buildTime).find((p) => p.type === "timeZoneName")?.value ?? tz;
}
