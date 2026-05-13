# Solana Tec Smart Solar Calculator

## Overview

Solana Tec Smart Solar Calculator is a WordPress plugin for **Domestic Tariff A** residential estimates in Johor and Melaka. It uses the February 2026 NEM/ATAP rate structure to show:

- Estimated system size based on single-phase or three-phase supply
- Monthly solar generation
- Self-consumption versus export to grid
- Monthly, annual, and 25-year savings projections
- Payback period estimates

Version: 2.0.6  
Author: Mojo Digital

## What This Release Supports

- Domestic Tariff A only
- Locations: Johor Bahru, Batu Pahat, Kluang, Muar, Melaka, Johor (Other Areas)
- Payment methods: Cash, Loan, Credit Installment
- Required email capture before the estimate runs
- Built-in estimate email to the visitor and lead notification email to the site admin
- Optional post-results follow-up form for name and contact number
- Admin dashboard, lead management, and CSV export

## What This Release Does Not Include

- Commercial or industrial tariff flows
- Public diagnostic pages or verification scripts
- Public test shortcodes

## Installation

1. Upload the `nem-calculator` folder to `/wp-content/plugins/`.
2. Activate the plugin from **Plugins** in WordPress admin.
3. Add `[nem_calculator]` to a page or post.
4. Open **Solana Tec > Settings** to configure colors, lead capture, and CTA options.

## Usage

Users complete five required inputs:

1. Email address
2. Monthly electricity bill
3. Location
4. Payment method
5. Voltage level

The calculator then returns estimated savings and charts based on the current NEM/ATAP rates, and emails the same estimate summary to the visitor.

## Requirements

- WordPress 5.0 or newer
- PHP 7.2 or newer
- A theme that allows standard shortcode rendering

## Support Notes

- Chart rendering depends on Chart.js loading from CDN.
- Visitor email is stored with the calculation when the estimate is generated.
- If post-results lead capture is enabled, name and phone can be added to the same calculation record afterward.
- Invalid or expired AJAX nonce requests are rejected.
