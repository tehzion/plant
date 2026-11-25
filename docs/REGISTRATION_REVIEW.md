# Reviewed product registration evidence

Chemical matches pass both the existing purpose/restriction checks and a current entry in `server/data/productRegistrations.js`. An empty registry deliberately sends all chemical candidates to discovery. Fertilizer and supplement checks are unchanged. This is a curated lookup, not a live government registration service.

The catalogue owner must check the current registered label and add exact product IDs, registration number, HTTPS label source, explicit crop and target names/approved language aliases, reviewer identifier, verification date and review expiry. Never infer these from product descriptions, ingredient matches or an AI answer.

Entry fields: `productId`, `registrationNumber`, `labelUrl`, `crops` (array), `targets` (array), `reviewedBy`, `verifiedAt`, `reviewUntil` (ISO dates). No real entries were available during implementation. Registration/label validation by the partner remains a release dependency for chemical treatment recommendations.
