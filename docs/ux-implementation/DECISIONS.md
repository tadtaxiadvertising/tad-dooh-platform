# UX Implementation Decisions

## D-001 — Security gates precede visual mutation

Date: 2026-10-28

When Phase 00 discovery finds a credential leak, destructive public route, or
authorization bypass, the UX pipeline pauses implementation and closes that
gate with a focused regression test. Discovery and non-mutating baseline work
may continue in parallel.

## D-002 — Preserve offline-first Driver invariants

The UX branch will not modify the Driver service worker, Workbox runtime cache,
IndexedDB schema, synchronization ordering, or telemetry contracts unless a
separate evidence-backed work card explicitly requires it.

## D-003 — Do not reconcile prices in presentation code

The RD$2,500/RD$1,500 mismatch is a financial-contract decision, not a cosmetic
one. Existing values remain untouched until the financial source of truth is
confirmed.

## D-004 — Environment-only E2E identities

Test identities and credentials must come from environment variables. Test
files must neither contain production-like fallbacks nor log tokens. Suites
that need authenticated identities skip clearly when isolated credentials are
not configured.

## D-005 — Treat legacy aliases as compatibility surfaces

Canonical Driver and Advertiser routes may be clarified visually, but existing
aliases and redirects are preserved until browser evidence shows that removing
or changing one cannot break an active entry point.
