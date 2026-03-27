# [FIX] Client-Side Exception (System Crash)

The dashboard is crashing with a full-page "Application error" (black screen). This is likely caused by a **hydration mismatch** or a **runtime object-in-React-child** rendering error, both of which can happen when server/client states differ or when AI-generated JSON is malformed.

## Proposed Changes

### [UI Components]

#### [MODIFY] [AIInsightBanner.tsx](file:///c:/Users/pichau/Downloads/precificador/focusos/components/dashboard/AIInsightBanner.tsx)
- **Defensive Rendering**: Wrap `insight.title` and `insight.body` in `String()` or check if they are objects.
- **Format Normalization**: Handle both single objects and arrays (common with AI outputs).
- **Hydration Safe**: Use a `mounted` state to skip rendering from `sessionStorage` on the server.

#### [MODIFY] [ScoreWidget.tsx](file:///c:/Users/pichau/Downloads/precificador/focusos/components/dashboard/ScoreWidget.tsx)
- **Hydration Warning**: Use `suppressHydrationWarning` on labels that depend on server-side time vs client-side time (Ex: "HOJE", "ONTEM").

#### [MODIFY] [DashboardPage.tsx](file:///c:/Users/pichau/Downloads/precificador/focusos/app/(app)/dashboard/page.tsx)
- **Label Safety**: Wrap sections labels in `suppressHydrationWarning`.
- **Error Robustness**: Ensure `selectedDate` is always a valid [Date](file:///c:/Users/pichau/Downloads/precificador/focusos/app/%28app%29/dashboard/page.tsx#57-63) object during hydration.

### [API Layer]

#### [MODIFY] [insights/route.ts](file:///c:/Users/pichau/Downloads/precificador/focusos/app/api/ai/insights/route.ts)
- **Consistent Response**: Standardize the JSON output format and ensure the `replan` type is consistently handled.

## Verification Plan

### Automated Tests
- [ ] **Build Check**: `npm run build` to confirm no static regressions.
- [ ] **Console Audit**: Use `browser_subagent` to verify no more "Prop className did not match" or "Objects are not valid" errors.

### Manual Verification
- [ ] Verify that the dashboard loads immediately on a fresh session.
- [ ] Click "Gerar Sugestões" to ensure the AI insight generates and updates without crash.
- [ ] Check label consistency across navigation (Hoje, Ontem, Amanhã).
