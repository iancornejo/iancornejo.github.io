// Ian Cornejo's CV, typeset from the same YAML files as the website (src/data/).
//
// Build (the deploy workflow runs this before the Astro build):
//   typst compile --root . --font-path cv/fonts cv/cv.typ public/ian-cornejo-cv.pdf
// Tailored version: pick sections, in this order, with --input, e.g.
//   typst compile --root . --font-path cv/fonts \
//     --input sections=education,appointments,funding,publications,awards cv/cv.typ cv-short.pdf
// Sections: education appointments funding publications software presentations awards
//           fieldwork workshops teaching service skills

#let profile = yaml("/src/data/profile.yaml")
#let pubs = yaml("/src/data/publications.yaml")
#let talks = yaml("/src/data/presentations.yaml")
#let dc = yaml("/src/data/datacode.yaml")
#let cv = yaml("/src/data/cv.yaml")

// Art glass palette (src/styles/tokens.css)
#let umber = rgb("#2E241D")
#let muted = rgb("#66574A")
#let red = rgb("#A3352A")
#let blue = rgb("#2F4B9A")
#let rule-color = rgb(46, 36, 29, 70)

#let all-sections = (
  "education", "appointments", "funding", "publications", "software", "presentations",
  "awards", "fieldwork", "workshops", "teaching", "service", "skills",
)
#let chosen = if "sections" in sys.inputs {
  sys.inputs.sections.split(",").map(s => s.trim())
} else { all-sections }

#set document(title: profile.name + " · Curriculum vitae", author: profile.name)
#set page(
  paper: "us-letter",
  margin: (x: 0.8in, top: 0.7in, bottom: 0.8in),
  footer: context {
    set text(size: 7.5pt, fill: muted)
    [#profile.name · Curriculum vitae · Updated #datetime.today().display("[month repr:long] [day padding:none], [year]")]
    h(1fr)
    counter(page).display("1 of 1", both: true)
  },
)
#set text(font: "Geom", size: 9.6pt, fill: umber, lang: "en")
#set par(leading: 0.58em)
#show link: set text(fill: blue)
#show strong: set text(weight: 600)

// ---------- helpers ----------
#let me = "I. C. Cornejo"
#let invert(name) = {
  let parts = name.split(" ")
  parts.last() + ", " + parts.slice(0, -1).join(" ")
}
#let author-list(names) = {
  let shown = names.enumerate().map(((i, n)) => {
    let s = if i == 0 { invert(n) } else { n }
    if n == me { strong(s) } else { [#s] }
  })
  if shown.len() == 1 { shown.first() } else if shown.len() == 2 {
    shown.first() + [, and ] + shown.last()
  } else { shown.slice(0, -1).join([, ]) + [, and ] + shown.last() }
}
#let doi-link(doi) = link("https://doi.org/" + doi)[doi:#doi]
#let details(p) = {
  let out = ""
  if "volume" in p { out += ", " + str(p.volume) }
  if "issue" in p { out += "(" + str(p.issue) + ")" }
  if "pages" in p { out += ", " + str(p.pages) }
  out
}
#let journal(p) = emph(p.at("journal_short", default: p.journal))
// "Q. J. R. Meteorol. Soc." already ends in a period; don't add another.
#let stop(p) = if details(p) == "" and p.at("journal_short", default: p.journal).ends-with(".") { "" } else { "." }
#let sub(body) = text(size: 8.6pt, fill: muted, body)

#let section(title, body) = block(above: 17pt, below: 0pt)[
  #block(below: 8pt, sticky: true)[
    #text(size: 8pt, weight: 500, tracking: 0.24em, fill: red, upper(title))
    #v(-5pt)
    #line(length: 100%, stroke: 0.5pt + rule-color)
  ]
  #body
]
#let subhead(title) = block(above: 9pt, below: 6pt, sticky: true, text(weight: 600, title))
#let row(when, what) = block(below: 6.5pt, breakable: false, grid(
  columns: (1.05in, 1fr),
  column-gutter: 12pt,
  text(size: 8.6pt, fill: muted, when), what,
))

// ---------- header ----------
#grid(
  columns: (auto, 1fr),
  column-gutter: 14pt,
  align: horizon,
  image("radar-mark.svg", height: 0.6in),
  [
    #text(size: 22pt, weight: 700, tracking: -0.01em, profile.name)
    #v(-2pt)
    #text(size: 10.5pt)[#profile.position · #profile.institution · #profile.location]
  ],
)
#v(4pt)
#{
  let email = profile.email.user + "@" + profile.email.domain
  set text(size: 8.8pt)
  link("mailto:" + email, email)
  [ · ]
  link("https://orcid.org/" + profile.orcid)[ORCID #profile.orcid]
  [ · ]
  link("https://github.com/" + profile.github)[github.com/#profile.github]
  [ · ]
  link("https://iancornejo.github.io")[iancornejo.github.io]
}

// ---------- sections ----------
#let sections = (
  education: () => section("Education", {
    for e in cv.education {
      row(str(e.year), [#e.degree, #e.institution#if "thesis" in e [ \ #sub(e.thesis)]])
    }
  }),
  appointments: () => section("Appointments", {
    for a in cv.appointments { row(str(a.dates), [#a.title, #a.institution]) }
  }),
  funding: () => section("Fellowships and grants", {
    for f in cv.funding {
      row(str(f.dates), [#f.title \ #sub[#f.sponsor#if "award" in f [, award #f.award]]])
    }
  }),
  publications: () => section("Publications", {
    subhead[Peer-reviewed]
    for p in pubs.filter(p => p.status in ("published", "accepted")) {
      row(str(p.year), [#author-list(p.authors), #p.year: #(p.title). #journal(p)#details(p)#stop(p) #if "doi" in p { doi-link(p.doi) }])
    }
    let pending = pubs.filter(p => p.status in ("in-revision", "in-review"))
    if pending.len() > 0 {
      subhead[In review and revision]
      for p in pending {
        let label = if p.status == "in-revision" { "In revision" } else { "In review" }
        row(label, [#author-list(p.authors): #(p.title). #journal(p)#stop(p)])
      }
    }
  }),
  software: () => section("Software and data", {
    for s in dc.software {
      row(str(s.added).slice(0, 4), [#(s.name)#if "short" in s [: #(s.short)]. #if "doi" in s { doi-link(s.doi) }])
    }
    for d in dc.datasets {
      row(str(d.year), [#author-list(d.authors), #d.year: #(d.title). #(d.publisher). #doi-link(d.doi)])
    }
  }),
  presentations: () => section("Presentations", {
    let invited = talks.filter(t => t.at("type", default: "") == "invited")
    if invited.len() > 0 {
      subhead[Invited talks]
      for t in invited {
        row(str(t.year), [#(t.title). #(t.meeting)#if "location" in t [, #(t.location)].])
      }
    }
    subhead[Conference presentations (first author)]
    for t in talks.filter(t => t.at("type", default: "") != "invited") {
      let kind = (talk: " (talk)", poster: " (poster)").at(t.at("type", default: ""), default: "")
      row(str(t.year), [
        #(t.title)#kind. #(t.meeting)#if "location" in t [, #(t.location)].#if "award" in t [ #strong(t.award).]
        \ #sub(author-list(t.authors))
      ])
    }
  }),
  awards: () => section("Awards and honors", {
    let all = cv.awards.map(a => (name: a.name, org: a.at("org", default: none), year: a.year))
    all += talks.filter(t => "award" in t).map(t => (name: t.award, org: t.meeting, year: t.year))
    for a in all.sorted(key: a => -a.year) {
      row(str(a.year), [#(a.name)#if a.org != none [, #(a.org)]])
    }
  }),
  fieldwork: () => section("Field campaigns", {
    for f in cv.fieldwork {
      row(str(f.dates), [#(f.campaign)#if "place" in f [, #(f.place)] \ #sub(f.role)])
    }
  }),
  workshops: () => section("Workshops and meetings", {
    for w in cv.at("workshops", default: ()) {
      let place = w.at("place", default: "")
      row(str(w.dates), [#(w.name)#if place != "" and place != none [, #place]])
    }
  }),
  teaching: () => section("Teaching and mentoring", {
    for t in cv.teaching { row(str(t.dates), [#t.role, #t.institution]) }
    for m in cv.at("mentoring", default: ()) { row([], [#m]) }
  }),
  service: () => section("Service", {
    for g in cv.at("service", default: ()) {
      subhead(g.group)
      for s in g.items { row([], [#s]) }
    }
  }),
  skills: () => section("Skills", {
    for s in cv.at("skills", default: ()) { row(s.label, [#s.items]) }
  }),
)

#for name in chosen {
  if name in sections { (sections.at(name))() }
}
