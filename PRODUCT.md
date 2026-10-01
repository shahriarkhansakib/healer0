# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary User Focus:** Patients managing their personal health journeys, appointments, clinical records, prescriptions, and communication with healthcare providers.
- **Secondary Roles (Platform-wide):**
  - **Doctors:** Managing patient encounters, clinical documentation, schedules, and consultations.
  - **Researchers:** Accessing anonymized clinical data cohorts, trials, and research metrics.
  - **Admins & Super Admins:** Overseeing facility management, role provisioning, security policies, and system audit logs.

## Product Purpose

Healer delivers a unified, high-integrity healthcare SaaS experience designed with hospital-grade security, auditability, and zero-compromise reliability. It eliminates friction in the patient experience while maintaining strict role isolation and regulatory compliance across clinical, research, and administrative tiers.

## Positioning

Unlike fragmented or generic clinical portals, Healer combines consumer-grade UX responsiveness for patients with enterprise-grade multi-role isolation, unified monorepo architecture (Next.js 15 + Hono + Drizzle), and zero layout-shift precision.

## Operating Context

- **Environment:** Responsive desktop and mobile web browsers across diverse lighting environments (clinics, home use, hospital terminals).
- **Critical Workflows:** Patient onboarding/triage, appointment booking, medical record access, secure communication, real-time status updates, and session management.
- **Integrations & Services:** PostgreSQL (local Docker / Neon cloud), Redis caching (ioredis / Upstash serverless), Better Auth v1 authentication, Cloudflare R2 object storage, and transactional messaging.

## Capabilities and Constraints

- **Strict Role-Based Access Control:** 5 distinct global roles (`patient`, `doctor`, `researcher`, `admin`, `super_admin`) with isolated navigation and route barriers.
- **Architecture:** Monorepo with Next.js 15 App Router serving frontend and Hono backend at `/api/*` (same-origin, zero CORS overhead).
- **Data Integrity:** Strict vertical slice architecture on backend (`route -> controller -> service`), server components by default, TanStack Query for remote state, Zustand for ephemeral UI.
- **Zero Layout Shift:** Rigid visual containers, skeleton loaders, and absence of jarring layout shifts.

## Brand Commitments

- **Name:** Healer
- **Tone & Voice:** Authoritative, reassuring, empathetic, clear, and clinical yet accessible.
- **Aesthetic Direction:** Clean, premium healthcare typography and calm, high-contrast visual hierarchy (Shadcn UI + Tailwind CSS v4) avoiding generic medical clichés.

## Evidence on Hand

- Monorepo structure with functional route tree: `/patient/*`, `/doctor/*`, `/researcher/*`, `/admin/*`, `/super-admin/*`.
- Configured authentication schemas, Drizzle models, and API endpoints.

## Product Principles

1. **Hospital-Grade Correctness & Security:** Data accuracy, privacy, and auditability outweigh speed or brevity.
2. **Patient-Centric Simplicity:** Complex clinical data presented with scannable clarity, minimizing cognitive load for patients during stressful health moments.
3. **Zero Layout Shift & Predictable Motion:** Deterministic UI rendering with fluid, purposeful transitions.
4. **Resilient & Serverless-Safe:** Robust fallback strategies across database, cache, and authentication layers.

## Accessibility & Inclusion

- Adherence to WCAG 2.1 AA contrast and accessibility standards.
- Full keyboard navigation and screen-reader compatibility across all clinical and patient-facing forms.
