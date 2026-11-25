# Production integration checklist

## Before a pilot with real staff
- [ ] Information security and architecture review of hosting, data flows and retention
- [ ] Data protection assessment for participant data, photos and feedback
- [ ] Approved hosting environment, domains and TLS
- [ ] Microsoft Entra ID app registration; role / group claims; event-scoped authorisation on the server
- [ ] PostgreSQL provisioned with backups, encryption at rest and row-level security
- [ ] Approved file storage with malware scanning and file-type validation
- [ ] Realtime service (WebSocket) with authenticated per-event channels and venue display tokens
- [ ] Server-signed rotating attendance QR tokens; attendance windows; organiser validation process
- [ ] PPTX/PDF → slide image conversion worker in an isolated environment
- [ ] Central logging, monitoring and alerting; audit log retention
- [ ] Accessibility review (WCAG 2.1 AA) and testing on low-end Android devices and slow connections

## Content to be supplied by BML
- [ ] Region and venue for each event
- [ ] Official trainer photos, designations, departments and biographies (with consent)
- [ ] Leadership names and roles for display
- [ ] Approved slide decks, notes, product and process update cards (no rates in drafts)
- [ ] Approved quiz questions and explanations per session
- [ ] Official service centre list
- [ ] Certificate template, signatory and eligibility rules
- [ ] Vendor activity instructions and scoring sheet

## Future integrations (need approval)
- [ ] Email and Microsoft Teams notifications
- [ ] HR system participant import instead of CSV
- [ ] Native Excel (.xlsx) and server-rendered PDF reports
- [ ] AI learning companion grounded in approved content, with citations and abstention
- [ ] Learning record export to the corporate LMS

## Remaining prototype limitations
- Data lives in one browser; nothing is shared between devices or people.
- Venue sync works only between tabs of the same browser on the same device.
- QR scanning, audience responses and offline queueing are simulated.
- No authentication; any role can be selected.
- Uploaded PPTX/PDF files are not stored or converted; slide images and photos are kept in local storage at reduced resolution, which limits how many you can add.
- Exports are CSV and browser print only; some embedded viewers block downloads and printing, so copy-to-clipboard is offered as a fallback.
- Pre/post assessment trends and performance cards use labelled demo values.
