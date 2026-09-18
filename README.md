# Revamp placement portal — demo

Separate copy of the production app: **2 projects**, **6 engineers**, no email delivery.

## Demo logins

| Role | Username / NetID | Password |
| --- | --- | --- |
| Lead, Proj 1 | `Proj 1` | `abhi1` |
| Lead, Proj 2 | `Proj 2` | `abhi2` |
| Admin | PIN | `1031` |
| Engineers | `alex1` `blair2` `casey3` `devon4` `ellis5` `finn6` | NetID confirm flow |

Capacities are seeded at 3 + 3. Do not press **Lock & Email Results** unless you want to freeze the snapshot; this demo does not send mail.

## Swap in your Google Sheet

1. Duplicate `public/demo-hired.csv` into a Google Sheet (same column order, Illinois emails in one of the two Email Address columns).
2. Share the sheet as **Anyone with the link can view**.
3. Add `GOOGLE_SHEET_ID` and `GOOGLE_SHEET_GID` to the Vercel project, then redeploy.

Until those are set, the deployed app reads `/demo-hired.csv`.
