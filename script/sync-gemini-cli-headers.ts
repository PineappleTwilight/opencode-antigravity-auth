import fs from "node:fs";
import path from "node:path";

/**
 * Syncs request headers from gemini-cli to our project.
 * Generated at build time and placed in src/generated/headers.ts.
 */
function syncHeaders() {
  const geminiCliCorePath = "gemini-cli/packages/core";
  const geminiCliPkgJsonPath = path.join(geminiCliCorePath, "package.json");

  if (!fs.existsSync(geminiCliPkgJsonPath)) {
    console.warn("Skipping header sync: Could not find gemini-cli package.json at", geminiCliPkgJsonPath);
    return;
  }

  const pkgJson = JSON.parse(fs.readFileSync(geminiCliPkgJsonPath, "utf-8"));
  const version = pkgJson.version;

  const platform = process.platform === "win32" ? "windows" : "linux";
  const arch = process.arch === "x64" ? "x64" : "arm64";
  const userAgent = `GeminiCLI/${version}/gemini-2.5-pro (${platform}; ${arch}; terminal)`;
  const xGoogApiClient = `gl-node/${process.versions.node}`;
  const clientMetadata = `ideType=GEMINI_CLI,platform=${platform.toUpperCase()}_${arch.toUpperCase()},pluginType=GEMINI`;

  const outputDir = "src/generated";
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const output = `/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// AUTO-GENERATED FROM gemini-cli.
// DO NOT EDIT MANUALLY. Run 'npm run prebuild' to update.

export const GEMINI_CLI_VERSION = "${version}";

export const GEMINI_CLI_HEADERS = {
  "User-Agent": "${userAgent}",
  "X-Goog-Api-Client": "${xGoogApiClient}",
  "Client-Metadata": "${clientMetadata}",
} as const;
`;

  fs.writeFileSync(path.join(outputDir, "headers.ts"), output);
  console.log(`Synced headers from Gemini CLI v${version} to ${outputDir}/headers.ts`);
}

syncHeaders();
