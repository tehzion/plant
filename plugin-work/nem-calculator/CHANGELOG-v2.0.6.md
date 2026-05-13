# Version 2.0.6

## Production Remediation Update

This package reflects the cleaned production release for the Solana Tec Smart Solar Calculator.

### Included in this release

- Domestic Tariff A residential calculator flow
- Johor and Melaka irradiance locations
- Payment methods: Cash, Loan, Credit Installment
- February 2026 NEM/ATAP import and export rate presentation
- Lead capture, dashboard, and CSV export

### Fixed

- Comparison table 25-year total calculation in frontend JavaScript
- Security nonce handling for the public AJAX endpoint
- Public request handling so the calculator stays within Domestic Tariff A scope
- Payment-method validation alignment between frontend and backend

### Removed from the production ZIP

- `verify.php`
- `test-ajax.html`
- `test-standalone.html`
- `assets/js/nem-diagnostic.js`
- `includes/test-shortcode.php`
- Internal QA and troubleshooting artifacts that were not intended for production delivery
