# Level 5 user-feedback Google Form — ready to paste

Not created yet — this needs a real Google account and real respondents.
Paste these questions into a new Google Form (forms.google.com) as-is.

1. **Your Stellar wallet address** (Short answer, required)
   Validation: regex `^G[A-Z2-7]{55}$`
2. **Your email** (Short answer, required, "Email" validation type)
3. **Your name** (Short answer, required)
4. **How would you rate Lumina?** (Linear scale 1–5, required)
   1 = "Confusing / broken", 5 = "Clear and useful"
5. **What did you use Lumina for / what did you try?** (Paragraph, optional)
6. **What's the single most confusing part of the flow?** (Paragraph, optional)
7. **What would make you use a shielded pool like this for real?**
   (Paragraph, optional)
8. **Can we follow up with you?** (Yes/No)

Form settings: enable "Collect email addresses" off (question 2 already
asks explicitly, don't double-collect), and turn on response summary charts
for the rating question so the export is easy to skim.

## Export step (do after real responses exist)

Google Forms → Responses tab → the green Sheets icon → "Create
spreadsheet" → File → Download → Microsoft Excel (.xlsx). Commit that
`.xlsx` (or a link to the Sheet, if it should stay live) under
`docs/feedback/` and link it from the README's Level 5 section, along with
a commit link for each product change made in response to it (see
`docs/FEEDBACK_LOG.md`).
