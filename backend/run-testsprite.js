const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");
const path = require("path");

async function runTestSprite() {
  const transport = new StdioClientTransport({
    command: process.platform === 'win32' ? "npx.cmd" : "npx",
    args: ["@testsprite/testsprite-mcp@latest", "server"],
    env: {
      ...process.env,
      TESTSPRITE_API_KEY: "sk-user-Bts2e-KtGon595wIiYPoU3ekap0qQ0_UPwc_wS-8YGnMOfReaYteBRs6FM5HG51T-PkLTvyt_1WT6Bfp0pBY0v4N0opeqlvkY_3S2DUK60TcqrKsgrNf_OXyztIBim73OYI"
    }
  });

  const client = new Client({
    name: "Antigravity-Client",
    version: "1.0.0"
  }, {
    capabilities: {}
  });

  console.log("Connecting to MCP...");
  await client.connect(transport);

  console.log("Connected! Listing tools...");
  const toolsResponse = await client.listTools();
  console.log("Tools available:", toolsResponse.tools.map(t => t.name));

  console.log("\\nCalling testsprite_generate_code_and_execute...");
  try {
    const result = await client.callTool({
      name: "testsprite_generate_code_and_execute",
      arguments: {
        tests_description: "Test the backend NestJS APIs focusing on Device and Campaign functionalities.",
        serverCommand: "npm run start"
      }
    });

    console.log("Result:", result);
  } catch (error) {
    console.error("Tool execution failed:", error);
  }

  process.exit(0);
}

runTestSprite().catch(console.error);
