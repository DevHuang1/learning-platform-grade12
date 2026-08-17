# Learning Platform Grade 12 — Theme Cohesion Plan

## Theme Name: Editorial Study Hall
**Very Brief Intro:** A calm, scholarly interface that blends a warm paper-like canvas with deep ink typography and a disciplined teal accent. The goal is to make every route feel like one connected learning environment rather than a collection of separate screens.

**Probability:** 0.07

## Theme Name: Signal & Slate
**Very Brief Intro:** A focused academic dashboard with cool slate surfaces, precise blue signal accents, and compact information architecture. It prioritizes clarity and operational speed for students moving between subjects and progress views.

**Probability:** 0.04

## Theme Name: Botanical Lab
**Very Brief Intro:** A softer learning environment built around moss, clay, and parchment tones, using organic shapes and gentle texture to make study feel grounded and human. It favors warmth over conventional SaaS polish.

**Probability:** 0.08

## Chosen Approach: Editorial Study Hall

### Design Movement
Contemporary editorial design with references to independent magazines, university reading rooms, and modern Swiss information systems.

### Core Principles
1. One semantic token system must govern every page, component, state, and overlay.
2. Ink-first hierarchy: typography and spacing carry meaning before decoration does.
3. Warm surfaces and a restrained teal accent should make long study sessions feel calm and legible.
4. Shared shells, controls, and feedback states should feel unmistakably related even when page content changes.

### Color Philosophy
The base is a warm chalk canvas rather than stark white, paired with dark ink for comfortable contrast. Teal is reserved for action, progress, focus, and links so its meaning stays consistent throughout the platform. Clay is used sparingly for warnings and human emphasis, not as a second primary accent.

### Layout Paradigm
Use a persistent left rail for platform-level navigation and a generous editorial content column for page material. Subpages should inherit the same shell instead of rebuilding headers independently. Dense information belongs in grouped cards with clear rhythm, while primary learning content gets breathing room.

### Signature Elements
- A slim teal progress rule used in active navigation and learning completion states.
- Small section labels in uppercase tracking, inspired by printed course syllabi.
- Soft paper grain and low-contrast rules that make surfaces feel material without reducing accessibility.

### Interaction Philosophy
Controls should feel quiet and deliberate. Hover states reveal hierarchy through a slight surface lift and teal edge, while active states use a compact press response. No route should introduce a new button language, radius system, or unrelated accent color.

### Animation
Use 160–220ms transitions with a strong ease-out. Shared shell elements enter with a short opacity/translate reveal only on initial load; navigation and frequent controls use transitions rather than repeated keyframe motion. Respect reduced-motion preferences globally.

### Typography System
Use Fraunces for display headlines and Newsreader for body copy, with a system sans stack reserved for labels, navigation, metadata, and controls. Headlines are editorial and compact; body text is generous and readable; labels use uppercase tracking with no more than 0.12em letter spacing.

### Brand Essence
A focused Grade 12 learning environment for students who want their progress, subjects, and study materials to feel connected and calm. Personality: **grounded, exacting, encouraging**.

### Brand Voice
Headlines are concise and purposeful. CTAs are specific and active. Microcopy should sound like a thoughtful tutor, never like generic software filler.

Example lines:
- “Make the next concept easier to hold.”
- “Your week, marked by progress.”

### Wordmark & Logo
A typographic wordmark paired with a simple open-book mark formed from two offset teal brackets. The mark should work as a compact icon in the shared shell and favicon without relying on text.

### Signature Brand Color
**Study Teal — #167C80**, a deep blue-green chosen to signal focus and forward motion without the urgency of saturated blue.

## Shared Theme Implementation Rules
- All semantic colors live in `client/src/index.css` as CSS variables and are consumed through Tailwind semantic utilities.
- `ThemeProvider` owns the single active mode and applies the theme class at the document root; no page may manage its own theme class.
- `App.tsx` owns the persistent platform shell so every route inherits the same navigation, background, typography, and overlay behavior.
- Reusable UI primitives must use semantic tokens (`bg-card`, `text-foreground`, `border-border`, etc.) instead of route-specific hex values.
- Dark mode, if enabled later, must be expressed as a full token set rather than per-page overrides.

## Style Decisions

- Each route keeps the shared shell but expresses a distinct editorial study artifact: Subjects as course desk, Progress as logbook, and Resources as shelf/archive.
- Study Teal `#167C80` remains reserved for actions, active navigation, progress evidence, and links; decorative emphasis comes from ink, paper, rules, and editorial layout before color.
- Progress pages lead with measurement language—streaks, marks, timelines, completion evidence, and logged rhythm—rather than repeating the subject-list structure.
