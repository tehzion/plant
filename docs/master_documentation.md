# 🍀 Tehzion Plant: Master Application Documentation

Welcome to the **Tehzion Plant** intelligence suite. This document provides a high-level overview of the application architecture, user identity system, and core intelligence modules.

---

## 1. Executive Summary
**Tehzion Plant** is a next-generation "Agro-Intelligence" platform designed to bridge the gap between AI-driven diagnostics and real-world farm management. It serves as an all-in-one companion for farmers, offering real-time pest/disease detection, global compliance logging (MyGAP), and context-aware agricultural supply chains.

---

## 2. Technical Architecture & Stack
The application is built on a modern, high-performance web stack designed for reliability and speed:

- **Frontend**: React 18, Vite (for ultra-fast bundling), and Vanilla CSS / Tailwind (hybrid).
- **Identity & Persistence**: Supabase (Cloud) + Encrypted LocalStorage (Offline-First).
- **Core Intelligence**: 
  - **OpenAI GPT-4o-mini**: Advanced plant pathology analysis, natural language parsing, and risk prediction.
  - **PlantNet API**: Global species identification.
- **E-Commerce**: WooCommerce REST API integration with AI-driven product mapping.

---

## 3. The Identity System: Dual-Mode User Profiles
Our unique **Guest-First** architecture ensures that farmers can use all features immediately, without friction.

### A. Guest Mode (Instant Access)
- **Guest ID**: A persistent, unique `sea_plant_guest_id` is generated for every browser.
- **LocalStorage**: Your scan history, farm plots, and MyGAP logs are stored locally using **AES-256 encryption**.
- **Privacy**: No personal data is required; the app tracks orders via metadata linking.

### B. Account Mode (Supabase)
- **Centralized Sync**: Logging in (via Email or Google) migrates all local guest data to the cloud.
- **Cross-Device Access**: Farm data is synchronized across mobile and desktop.
- **Verification**: Verified Farmer badges are issued to users who complete their professional profiles.

---

## 4. Primary Modules

### 🩺 AI Diagnostic Engine
The heart of the app. It uses computer vision to identify crops and detect pathogens. 
- **Dynamic SOPs**: Generates step-by-step Standard Operating Procedures based on the severity of the detection.
- **Risk Assessment**: Predicts future outbreaks based on recent logs and historical weather patterns.

### 📜 MyGAP Digital Logbook
A comprehensive tool for **Good Agricultural Practice** compliance.
- **Structured Fields**: Log spraying, pruning, fertilizing, and harvesting in professional formats.
- **Natural Language Parsing**: "Spray 20L of Mancozeb on Plot A" — the AI automatically parses this into a structured database entry.

### 🛒 AI-Driven Shop (WooCommerce)
Not just a store, but a contextual aid.
- **Smart Recommendations**: Recommendations are mapped to your specific scan results (e.g., detected *Late Blight*? The shop highlights *Fungicides* first).
- **Local History**: Track orders anonymousely using the guest metadata system.

---

## 5. Security & Internationalization
- **High-Density Design**: The "Superapp" UI is optimized for field use with high-density components and a 680px center-aligned layout.
- **Localization (i18n)**: 100% parity across **English (EN)**, **Malay (MS)**, and **Chinese (ZH)**.
- **Offline Resilience**: Essential features (scout database, calculators, and recent history) remain functional even with poor field connectivity.

---

## 📅 Roadmap: What's Next?
- **Phase 2**: Native in-app checkouts and regional spray window alerts.
- **Phase 3**: Full Supabase cloud-sync activation and community disease-mapping heatmaps.

> [!TIP]
> **Pro Tip**: Use the **AI Agronomist** (Overview Tab) to get a weekly summary of your farm's health without reading through dozens of log entries.
