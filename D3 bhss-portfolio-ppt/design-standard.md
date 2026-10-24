# BHSS POC interface standard

This standard applies to the self-contained presentation and its interactive role demo. It is deliberately restrained so that activity evidence and workflow status remain the focus.

## Visual tokens

- Background: `#f5f6f7`; surface: `#fbfcfc`; main text: `#26313a`; muted text: `#66727c`; separator: `#d9dfe3`.
- Accent: muted blue-grey `#527382`. Prefer pale accent fills with dark text; avoid saturated primary buttons.
- Status colours: muted green `#557467`, amber `#826d48`, and red `#885b5b`. Colour never carries meaning alone; every state has a text label.
- Spacing: `4, 8, 12, 16, 24, 32px`.
- Type: system sans-serif, with a practical `12, 14, 16, 20, 28, 36px` scale. Use system monospace only for IDs and source references.
- Radius: `0, 4, 8px`. Avoid nested containers that repeat the same border, colour, and radius.

## Layout rules

- Prefer one parent surface with line-separated rows over multiple nested cards.
- Use left/right padding plus top/bottom separators for lists and records.
- Give dense role panels a fixed available height and vertical scrolling instead of allowing uneven containers to overflow.
- Keep the action and its feedback together. Examples: file too large, choose an Activity type, OCR completed, and transcription failed.
- Reserve a floating top-level alert for system-wide failures such as a `400` response or an unavailable processing service.

## Workflow visibility

- Draft Activity Teacher Q1–Q5 results are hidden from students.
- A rating average is eligible only after all assigned teachers submit or the Class Teacher explicitly closes the rating window.
- The Class Teacher reviews individual portfolio rows and separately approves the final period snapshot.
- Student external certificates use a separate upload path. VASK may be proposed; no official eight-skill mapping is created by default.
- Staff rows display student ID, information item, submitter, reviewer, and lifecycle status.

## Framework references

The implementation uses plain CSS tokens so the POC remains self-contained. The scale and utility concepts align with current Tailwind CSS and Bootstrap conventions, while feedback placement and non-colour status labels follow WCAG 2.2 guidance. These frameworks are references, not runtime dependencies.
