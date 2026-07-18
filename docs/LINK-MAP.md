# Link Map — every URL in the platform

Base (local): **http://127.0.0.1:3000** — server must be running (`docker start membership-db` then `npm run dev` in `D:\membership-platform`, or ask Claude to start it). All logins: password `Demo123!`.

## Public site (no login)
| Page | URL |
|---|---|
| Landing | http://127.0.0.1:3000/ |
| All tiers | http://127.0.0.1:3000/join |
| Individual tier | http://127.0.0.1:3000/join/INDIVIDUAL |
| Enterprise Standard tier | http://127.0.0.1:3000/join/ENT_STANDARD |
| Enterprise Investor Ready tier | http://127.0.0.1:3000/join/ENT_INVESTOR |
| Temporary (Summit) tier | http://127.0.0.1:3000/join/TEMPORARY |
| Login (all roles) | http://127.0.0.1:3000/login |
| Privacy policy | http://127.0.0.1:3000/privacy |

## Member portal — log in as `alice@member.demo` or `bruno@acme.demo`
| Page | URL |
|---|---|
| Dashboard | http://127.0.0.1:3000/portal/dashboard |
| Membership & wallet | http://127.0.0.1:3000/portal/membership |
| Mentoring | http://127.0.0.1:3000/portal/mentoring |
| Summit | http://127.0.0.1:3000/portal/summit |
| Article & video | http://127.0.0.1:3000/portal/content |
| Investor pitch | http://127.0.0.1:3000/portal/pitch |
| News & networking | http://127.0.0.1:3000/portal/news |

## Admin console — log in as `admin@platform.demo`
| Page | URL |
|---|---|
| Overview | http://127.0.0.1:3000/portal/admin |
| Members (search/filter) | http://127.0.0.1:3000/portal/admin/members |
| Member 360° (example: Bruno) | http://127.0.0.1:3000/portal/admin/members — click through, no fixed ID |
| Payments & wallet | http://127.0.0.1:3000/portal/admin/payments |
| Summit console | http://127.0.0.1:3000/portal/admin/summit |
| Deal-flow | http://127.0.0.1:3000/portal/admin/dealflow |
| Approvals | http://127.0.0.1:3000/portal/admin/approvals |
| Reports | http://127.0.0.1:3000/portal/admin/reports |
| Audit log | http://127.0.0.1:3000/portal/admin/audit |
| Email log | http://127.0.0.1:3000/portal/admin/emails |
| Settings | http://127.0.0.1:3000/portal/admin/settings |

## Sales console — log in as `sales@platform.demo`
| Page | URL |
|---|---|
| Pipeline | http://127.0.0.1:3000/portal/sales |
| Manual enrolment | http://127.0.0.1:3000/portal/sales/enrol |

## Mentor console — log in as `mentor@platform.demo`
| Page | URL |
|---|---|
| My members | http://127.0.0.1:3000/portal/mentor |

## Investor console — log in as `investor@platform.demo`
| Page | URL |
|---|---|
| Deal-flow | http://127.0.0.1:3000/portal/investor |

## Consultant console — log in as `consultant@platform.demo`
| Page | URL |
|---|---|
| My members | http://127.0.0.1:3000/portal/consultant |
| Article drafts | http://127.0.0.1:3000/portal/consultant/articles |

## Demo accounts (all `Demo123!`)
`admin@platform.demo` · `sales@platform.demo` · `mentor@platform.demo` · `investor@platform.demo` · `consultant@platform.demo` · `alice@member.demo` (Individual) · `bruno@acme.demo` (Enterprise Standard, near-threshold wallet) · `chen@nova.demo` (Investor Ready, unlocked + booked) · `dora@lumen.demo` (Temporary, Summit intent submitted)

## Project documents (on disk, not web pages)
| Document | Path |
|---|---|
| Architecture | `D:\membership-platform\docs\ARCHITECTURE.md` |
| Design system | `D:\membership-platform\docs\DESIGN-SYSTEM.md` |
| Requirements compliance audit | `D:\membership-platform\docs\REQUIREMENTS-COMPLIANCE.md` |
| Deployment runbook | `D:\membership-platform\docs\DEPLOYMENT.md` |
| Client walkthrough (this presenter's brief) | `D:\membership-platform\docs\CLIENT-WALKTHROUGH.md` |
| Client questionnaire (send this) | `D:\membership-platform\docs\Client-Clarification-Questionnaire.docx` |
| This link map | `D:\membership-platform\docs\LINK-MAP.md` |

**Note:** this is your local machine only — nothing here is on the public internet. If you need a link the client can open themselves (no laptop demo), that requires deploying it to a real host first (see DEPLOYMENT.md) — say the word and I'll walk you through standing up a shareable staging URL.
