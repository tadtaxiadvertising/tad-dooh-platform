import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";

const PROJECT_PATH = process.cwd();
const API_KEY = "sk-user-Bts2e-KtGon595wIiYPoU3ekap0qQ0_UPwc_wS-8YGnMOfReaYteBRs6FM5HG51T-PkLTvyt_1WT6Bfp0pBY0v4N0opeqlvkY_3S2DUK60TcqrKsgrNf_OXyztIBim73OYI";

async function callToolSafe(client, toolName, args, timeoutMs = 300000) {
  console.log(`\n📋 Calling ${toolName}...`);
  try {
    const result = await client.callTool({ name: toolName, arguments: args }, { timeout: timeoutMs });
    const text = result?.content?.[0]?.text || JSON.stringify(result);
    console.log(`✅ ${toolName} completed.`);
    if (text.length < 2000) console.log(text);
    else console.log(text.substring(0, 2000) + "...(truncated)");
    return { success: !result?.isError, result };
  } catch (err) {
    console.error(`❌ ${toolName} failed:`, err.message || err);
    return { success: false, result: null };
  }
}

async function runTestSprite() {
  const transport = new StdioClientTransport({
    command: process.platform === 'win32' ? "npx.cmd" : "npx",
    args: ["-y", "@testsprite/testsprite-mcp@latest"],
    env: { ...process.env, API_KEY }
  });

  const client = new Client({ name: "TAD-TestRunner", version: "1.0.0" }, { capabilities: {} });
  transport.onerror = (err) => console.error("Transport Error:", err);

  console.log("🔌 Connecting to TestSprite MCP Server...");
  await client.connect(transport);
  console.log("✅ Connected!\n");

  // Step 1: Check account info
  await callToolSafe(client, "testsprite_check_account_info", {});

  // Step 2: Bootstrap
  const bootstrap = await callToolSafe(client, "testsprite_bootstrap", {
    localPort: 3000,
    type: "backend",
    projectPath: PROJECT_PATH,
    testScope: "codebase"
  });

  if (!bootstrap.success) {
    console.log("⚠️  Bootstrap may have failed but continuing...");
  }

  // Step 3: Generate code summary
  await callToolSafe(client, "testsprite_generate_code_summary", {
    projectRootPath: PROJECT_PATH
  });

  // Step 4: Generate backend test plan
  await callToolSafe(client, "testsprite_generate_backend_test_plan", {
    projectPath: PROJECT_PATH
  });

  // Step 5: Generate code and execute tests
  const exec = await callToolSafe(client, "testsprite_generate_code_and_execute", {
    projectName: "tad-dooh-backend",
    projectPath: PROJECT_PATH,
    testIds: [],
    additionalInstruction: "Focus on testing the REST API endpoints: device registration, heartbeat, campaign CRUD, tablet sync, analytics ingestion, and fleet monitoring.",
    serverMode: "production"
  }, 600000);

  console.log("\n" + "=".repeat(60));
  console.log("🏁 TestSprite execution complete!");
  console.log("=".repeat(60));

  process.exit(0);
}

runTestSprite().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
