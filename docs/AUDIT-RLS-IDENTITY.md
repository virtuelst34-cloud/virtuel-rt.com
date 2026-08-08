# Audit: RLS & identity (pseudo vs UUID)

Date: 2026-08-08  
Scope: Virtuel-RT Supabase RLS + guest/auth identity paths.  
Goal: stop high-impact spoofing without breaking guest login. Full UUID migration is deferred.

## Findings

- **Messages INSERT was open on author identity** — policy only checked coquin/bienvenue gates (`can_insert_message`). Any anon/auth client could insert with an arbitrary `author_name` (impersonation).
- **Messages UPDATE was salon-gated only** — any actor who could access the salon could edit/pin any message text/metadata.
- **Messages DELETE had no tight own/admin policy** in the current migration chain (direct delete was effectively unconstrained or missing).
- **`preferences` RLS was `USING (true) WITH CHECK (true)`** — any client could read/write any `user_name` row. `is_premium` was already hardened by trigger/RPC, but theme and other fields were spoofable.
- **`guest_sessions` was world-readable/writable** — SELECT exposed `session_token`s → steal guest identity / spoof `current_actor_name()`.
- **Presence is keyed by pseudo** (`user_id` = `current_actor_name()`), with write RPCs that already verify actor + optional guest token (good pattern).
- **DMs / friends / mute-block (auth)** key off **display name**, not `auth.uid()` — rename or name collision = identity confusion; guests use `current_actor_name()` after `set_guest_session`.
- **`set_guest_session` is transaction-local** (`set_config(..., true)`). A separate RPC call does **not** stick for the next REST request (same issue presence fixed with in-RPC tokens). DMs/friends/quiz that only call `ensureGuestSessionContext()` remain fragile for guests.
- **`update_message_reaction` was SECURITY DEFINER with no actor check** — anyone could overwrite reaction JSON on any message.
- **Quiz UPDATE** allowed any non-null actor to mutate any session.

## Fixes shipped (this change)

Migration: `supabase/migrations/20260808210000_harden_rls_actor_identity.sql`

| Area | Change |
|------|--------|
| Messages INSERT | RLS requires `author_name = current_actor_name()` (exception: system `Quiz` in salon `quiz` only) |
| Messages write path | RPC `insert_own_message` (+ optional `p_guest_token`) forces author to actor |
| Messages UPDATE/DELETE | Own author or `is_site_admin()`; pin via `set_message_pinned`; delete via `delete_own_message` |
| Reactions | `update_message_reaction` requires actor (+ optional guest token) |
| Preferences | RLS own-row only; `upsert_own_preferences` RPC with guest token |
| Guest sessions | Direct table policies removed; `validate_guest_session` RPC; client no longer SELECTs tokens |
| Quiz | UPDATE/DELETE limited to creator or site admin |

Client: `src/lib/supabaseDb.ts`, `src/lib/guestAuthService.ts`.

## Remaining risks (follow-up: UUID migration)

1. **Canonical identity** — migrate `direct_messages`, `friends`, `blocked_users`, `muted_users`, `user_presence`, `preferences`, and message authorship to stable UUIDs (`auth.users.id` / guest session id), keep pseudo as display-only.
2. **Guest GUC on DMs/friends/quiz** — port writes to SECURITY DEFINER RPCs that accept `p_guest_token` in the same transaction (mirror presence/messages).
3. **Pseudo uniqueness & rename** — enforce global unique names across profiles + guests; on rename, rewrite or soft-map historical name keys (until UUID migration).
4. **Reaction integrity** — RPC still replaces full JSON; ideally merge per-actor emoji sets server-side.
5. **Quiz system author** — `author_name = 'Quiz'` remains a narrow exception; consider posting as the actor with a `is_system` / bot flag instead.
6. **schema.sql drift** — root `supabase/schema.sql` still shows older open policies; treat migrations as source of truth until schema dump is regenerated.

## Guest login compatibility

- Guests still register via `register_guest_session` and resolve actor via token → `current_guest_name()` → `current_actor_name()`.
- Message/presence/preferences writes that matter for guests now pass `p_guest_token` into RPCs (no reliance on sticky GUCs).
- Mute/block for guests remains localStorage-only (unchanged).
