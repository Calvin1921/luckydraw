# Security notes

Lucky Draw is currently a working prototype intended for isolated development and fictional-data demos. There is no production-security sign-off or supported-version guarantee.

## Known boundaries

Public session queries can expose remote-control tokens, and session/tier creation needs stronger authorization. Development bypass flags disable access checks without an automatic production guard. Participant display names are intentionally sent to public displays; backend logs can retain contact fields from imported records.

Use the fictional seed on a disposable development deployment. Never treat an event ID as a private controller credential. See [the engineering guide](docs/ENGINEERING.md#security-and-production-boundaries) for the specific boundaries and work required before a real event.

## Reporting

Do not put credentials, participant data, event identifiers, remote tokens or a working exploit against someone else's deployment in a public issue.

If this repository offers GitHub's private vulnerability-reporting control, use it. If no private channel is available, open only a minimal issue asking for a private reporting channel, without sensitive details. Do not test a deployment you do not own or have permission to assess.

Reports should use a local fictional-data reproduction and identify the affected behavior, expected boundary and possible impact. Redact secrets from logs and screenshots.
