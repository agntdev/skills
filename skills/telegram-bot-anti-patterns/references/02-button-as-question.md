---
title: Button label as a question
impact: MEDIUM
impactDescription: buttons should be actions, not queries
tags: anti-pattern, button-label, microcopy
---

## Don't: use a button label as a question

A button that says "Confirm?" is a question the user has to parse.
Buttons are **actions**, not queries — the user is committing to a
verb when they tap, not asking themselves one.

## Do: use a verb (action)

Replace "Confirm?" / "Are you sure?" / "Submit?" with verbs that
state what the tap will do.

```ts
// ❌ Bad
inlineKeyboard([[
  { text: "Confirm?", callback_data: "confirm:42" },
  { text: "Cancel?",  callback_data: "cancel:42"  },
]]);

// ✅ Good
inlineKeyboard([[
  { text: "✅ Confirm booking", callback_data: "confirm:42" },
  { text: "Cancel",             callback_data: "cancel:42"  },  // no emoji on cancel
]]);
```

Full button-label rules in
[telegram-bot-ux-rules](../../telegram-bot-ux-rules/SKILL.md) §1.