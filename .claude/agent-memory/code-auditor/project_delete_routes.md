---
name: DELETE route ownership pattern
description: The four DELETE routes (trend-report, signal-brief, newsletter-builder, linkedin-posts) use a two-step ownership check: fetch resource by ID with supabaseAdmin, then verify workspace.user_id matches the authenticated user. This is the approved pattern for these routes.
type: project
---

All four `[id]` DELETE routes follow the same ownership pattern:
1. Auth via `createSupabaseServerClient().auth.getUser()`
2. Fetch resource with `supabaseAdmin` to get `workspace_id`
3. Confirm `workspaces.user_id === user.id` via `supabaseAdmin`
4. Delete with `supabaseAdmin` including both `.eq('id', ...)` and `.eq('workspace_id', ...)`

**Why:** Admin client is used for all reads because these tables have RLS policies that require workspace context; the two-step approach avoids the need to chain all ownership checks in a single RLS-gated query.

**How to apply:** Any new DELETE route for a user-owned content table should follow this exact pattern. Do not skip the workspace ownership verification step.
