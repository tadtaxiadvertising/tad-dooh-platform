/**
 * Node 22 test-only resolver for Next.js extensionless TypeScript imports.
 * Browser/Next source is untouched. Never used in production.
 */
export async function resolve(specifier, context, nextResolve) {
  if (
    specifier === "./mobile-gateway-contract" &&
    context.parentURL?.includes("/mobile-gateway.ts")
  ) {
    return nextResolve("./mobile-gateway-contract.ts", context);
  }
  return nextResolve(specifier, context);
}
