# Proposal: a free token check as an entry point

## Problem

People cannot easily see what an issuer can do with a token: pause all transfers, block a wallet, create new tokens or change the contract's rules. These facts are public but buried in contract code, so they are invisible to anyone who cannot read it.

## Proposal

A free public page that explains these powers for any token in a few lines each, states who controls them, and ends with a path to learn about independent ratings and request one.

## Options

| Option                   | Effort | Notes                                                                 |
| ------------------------ | ------ | --------------------------------------------------------------------- |
| Static explainer         | Low    | Educational, but not specific to any token                            |
| Free checker (prototype) | Medium | Specific, shareable, measurable. This repository is a working version |
| Gated detailed report    | High   | Better lead capture, but adds friction before any value is shown      |

## Decision requested

Pilot the free checker for one chain, and review the wording with analysts before wider use.

## How to measure it

- Submissions per visit
- Share of visitors who open an explanation
- Reports printed or saved
- Click-through to the rating pages

The prototype already records these as anonymous events behind a small adapter, so a hosted analytics provider can be added in one file.

## Risks

- Findings are hints from function names and public data, so some will be wrong. Wording and disclaimers need analyst review.
- Anything that reads like a rating would mislead. The page states facts about powers, never a score or a grade.
- Public data sources are rate-limited and sometimes slow. A production version would need its own data layer.
