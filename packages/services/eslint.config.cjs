module.exports = {
  extends: ["next/core-web-vitals", "next/typescript"],
  rules: {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-require-imports": "off",
    "@typescript-eslint/ban-ts-comment": "off",
  },
  ignorePatterns: ["**/scripts", "**/scratch", "**/seed-nationwide.ts", "**/seed-santiago.ts", "**/seed-test-campaign-santiago.ts", "**/fix-rls.ts", "**/list-devices.ts", "**/check-db.ts", "**/fix-schema.ts", "**/seed.ts", "**/simulate-data.ts", "**/query_driver.ts", "**/add_payroll_columns.ts", "**/check-clean.ts", "**/test-email.ts", "**/audit-credentials.ts", "**/check-sti-devices.ts", "**/check_campaigns.ts", "**/clean-db.ts", "**/cleanup-old-logs.ts", "**/fix-admin.ts", "**/fix-adv.ts", "**/list-admins.ts", "**/list-ads.ts", "**/src/modules/campaign/__tests__", "**/src/modules/commission/__tests__", "**/src/modules/conversation/__tests__", "**/src/modules/payments", "**/src/modules/prisma", "**/src/modules/qr-scan/__tests__", "**/src/modules/referral", "**/src/modules/system-settings", "**/src/modules/verified-metrics/__tests__", "**/test-local.ts"],
  overrides: [
    {
      files: ["apps/admin/**/*.ts", "apps/advertise/**/*.ts", "apps/driver/**/*.ts", "apps/player/**/*.ts", "apps/advertiser/**/*.ts", "apps/simulator/**/*.ts"],
      rules: {
        "@typescript-eslint/no-require-imports": "off",
        "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      },
    },
  ],
};
