# P0 #313 — Main protection: authorized admin checkpoint

**Actualización 26-nov-2026:** `main` ya está protegido y exige Summary estricto también a administradores, pero la configuración completa devuelve `required_pull_request_reviews=null`. Véase la [auditoría actual y modo de verificación de solo lectura](2026-11-26-313-release-control-audit.md). Las instrucciones siguientes describen la instalación histórica sobre una rama sin protección; no se deben usar para sobrescribir la protección actual.

**Status: procedure prepared, not applied.** The connected GitHub integration cannot write branch protection; its read endpoint returned 403. An authorized GitHub administrator must run the following with GitHub CLI. Never paste tokens in chats or issues.

## Verified evidence (2026-11-21)

- Repository is public; main has protected=false and required status checks=off; repository rulesets are empty.
- PRs #446 and #448 were merged with failing or incomplete CI. GitHub CI alone does not stop merges.
- The required status check is **Summary**, emitted by GitHub Actions App ID **15368**. The Summary job in .github/workflows/ci.yml runs with if: always() and fails if any format, typecheck, test, Prisma, security or Docker prerequisite fails.
- GitHub REST docs: https://docs.github.com/en/rest/branches/branch-protection

## Fail-closed installation protocol

The checked-in script scripts/protect-main-branch.cjs is read-only by default (--plan). It targets only tadtaxiadvertising/tad-dooh-platform main, requires a same-SHA completed, passing Summary from app 15368, refuses existing branch protection or repository rulesets, and rechecks main HEAD immediately before a write.

The --apply operation also requires TAD_APPROVE_MAIN_PROTECTION=YES. It requests strict Summary, an independent review, stale-review dismissal, approval after the last push, administrator enforcement, resolved conversations, and bans force-push or branch deletion. The script reads back GitHub's branch protection before reporting verification; failures are not called success and no automatic rollback occurs.

**Note:** a solo developer will need an independent reviewer for the one-review rule. Do not bypass protections to merge. This does not control Railway/EasyPanel deploys or resolve credential #244 or database #217.

## Windows PowerShell — repository administrator

~~~powershell
Set-Location C:\tad-dooh-platform
gh auth status

# Safe read-only preflight; requires main Summary to be green.
node scripts/protect-main-branch.cjs --plan

# Only after inspecting the plan and arranging an independent reviewer:
$env:TAD_APPROVE_MAIN_PROTECTION = 'YES'
try {
  node scripts/protect-main-branch.cjs --apply
  if ($LASTEXITCODE -ne 0) { throw 'Branch protection not verified' }
} finally {
  Remove-Item Env:\TAD_APPROVE_MAIN_PROTECTION -ErrorAction SilentlyContinue
}
~~~

## Independent post-install verification

Use the Settings > Branches UI or GH CLI to check that main is protected, the Summary check is strict and pinned to app 15368, 1+ review is required, admins are enforced, force pushes/deletions disabled, and conversation resolution required:

~~~powershell
gh api repos/tadtaxiadvertising/tad-dooh-platform/branches/main --jq .protected
gh api repos/tadtaxiadvertising/tad-dooh-platform/branches/main/protection --jq '{required_status_checks,enforce_admins,required_pull_request_reviews,required_conversation_resolution,allow_force_pushes,allow_deletions}'
~~~

Then create a harmless test PR; confirm a pending/failed Summary **and** a missing independent review block merging. Record non-secret evidence in issue #313. Do not trigger a production deployment while testing. Only close #313 after both API verification and real merge-blocking verification.
