# RETIRED — legacy production-verification checklist (September 2026).
# It assumed a particular Supabase project and domain; those assumptions conflict
# with newer EasyPanel configuration and cannot establish production identity.
# Do not use repository templates to choose a live database or approve migration.
# Run the operator-only Node precheck FROM the actual EasyPanel API container:
#   node /app/scripts/verify-supabase-runtime-target.cjs
# First supply TAD_EXPECTED_SUPABASE_PROJECT_REF based on independent infra-owner
# confirmation. This verifies configured URL references ONLY; it does not
# establish the data location, perform backup or connect to the database.
Write-Error "TAD_REFUSED: verify-production.ps1 is retired because its hardcoded production project/domain assumptions are unverified. Refer to incident #217 and scripts/verify-supabase-runtime-target.cjs."
exit 1
