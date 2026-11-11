---
name: unslop-ai-ui-design
description: Use when designing, building or reviewing UI (React, Tailwind, shadcn, HTML/CSS) to remove generic AI-looking design and apply 20 concrete polish rules.
---

# Unslop UI design

Apply these rules whenever you create or change UI. When asked to review UI, check every rule and report findings.

## The 20 rules

### Remove noise

1. **Delete filter badges.** No decorative pills above headings ("New", "AI-powered", sparkle tags). A badge must show real status or filter real data.
2. **Drop redundant labels.** Don't label what's already obvious from content, icon or position ("Email:" beside an email, a "Name" header over a list of names).
3. **Unitalicize random words.** No italic, gradient or colored emphasis on single words in headlines. Emphasis only where meaning needs it.
4. **Mono only where needed.** Monospace is for code, IDs, keys and machine values. Never for headings, labels or body copy.
5. **Remove embellishments.** No gradient blobs, glows, glassmorphism, decorative shadows, noise textures or divider flourishes. Every visual element must do a job.

### Structure and hierarchy

5. **Use a design system.** Colors, spacing, radius and type come from tokens (Tailwind theme / CSS variables / shadcn components). No one-off hex values or magic numbers.
6. **Show the actual product.** Use real UI with realistic data instead of abstract illustrations or stock imagery. Placeholders look like real records.
7. **Enlarge the main feature.** Each view has one focal element, visibly larger or more prominent than everything else.
8. **Group with spacing.** Use whitespace to group: tight spacing inside a group, larger between groups. Don't wrap everything in bordered cards.
9. **Make headlines specific.** State the concrete outcome ("Assign a driver in two clicks"), not a vague promise ("Revolutionize your workflow").
10. **Emphasize the CTA.** One primary button per view, highest contrast. Everything else secondary or ghost.
11. **Add an accent color.** One accent, used sparingly for primary actions, selection and key states. Neutrals carry the rest.
12. **Keep icons consistent.** One icon set, one stroke width, consistent sizes. Never emoji as UI icons.

### Detail and craft

14. **Inner radius = outer radius − padding.** Nested rounded elements: e.g. outer `rounded-2xl` (16px) with `p-2` (8px) → inner `rounded-lg` (8px).
15. **Improve text contrast.** Body text at least 4.5:1, large text at least 3:1 (WCAG AA). No light grey on white for content.
16. **Wrap headlines properly.** `text-balance` on headings, `text-pretty` on paragraphs, sensible max width. No single-word last lines.
17. **Align by eye, not pixels.** Optically adjust icons beside text, play triangles, punctuation and round shapes so they look centered, even if the box isn't.
18. **Use tabular numbers.** `tabular-nums` (`font-variant-numeric: tabular-nums`) for tables, prices, weights, counters and timers so digits line up.
19. **Add loading states.** Every async action has a loading state (skeleton or button spinner), prevents double submit, and has empty and error states too.
20. **Animate useful feedback.** Motion only to confirm or explain (press, save, row added, toast), 150–250 ms, and respect `prefers-reduced-motion`. No decorative animation.

## When building UI

- Start from existing design tokens and components; add new tokens only if missing.
- Write realistic sample data, never lorem ipsum.
- Decide the one focal element and the one primary CTA before laying out the rest.
- Before finishing, run the checklist below on your own output.

## When reviewing UI

Go through rules 1–20 in order. For each problem found, report:

- the rule number and name
- where it is (file and line, or component)
- the concrete fix (class names or code)

Then list the 3 fixes with the biggest visual impact first. Skip rules with no problems instead of saying "OK" for each.

## Quick checklist

- [ ] No decorative badges, random italics or embellishments
- [ ] No redundant labels; mono only for code and IDs
- [ ] Tokens only; consistent icon set
- [ ] One focal element, one primary CTA, one accent color
- [ ] Spacing groups content; headline is specific and wraps well
- [ ] Nested radii follow outer − padding
- [ ] Contrast passes AA; numbers are tabular
- [ ] Loading, empty and error states exist
- [ ] Animations confirm actions and respect reduced motion
