<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- CRM data is read and written only through server functions in `src/lib/crm/crm.functions.ts`, which proxy the user's Google Apps Script web app at the `APPS_SCRIPT_URL` secret — the Google Sheet stays the source of truth and the URL never reaches the browser.
- Without `APPS_SCRIPT_URL` the app runs in demo mode with the sheet's sample rows and edits stay in memory — so the UI is usable before the sheet is connected.
- The Apps Script source shown on the Conexión page (`src/lib/crm/apps-script-code.ts`) maps columns by header name and the field keys must match `Opportunity` in `src/lib/crm/model.ts` — change both together.
- Query data is hydrated from SSR via `setupRouterSsrQueryIntegration`; UI in the root shell that depends on query data renders only after hydration to avoid mismatches.
