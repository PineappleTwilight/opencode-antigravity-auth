import fs from "node:fs";
import path from "node:path";

/**
 * Syncs request/response schemas from gemini-cli to our project.
 * Generated at build time and placed in src/generated/schemas.ts.
 */
function syncSchemas() {
  const geminiCliCorePath = "gemini-cli/packages/core";
  const converterPath = path.join(geminiCliCorePath, "src/code_assist/converter.ts");
  const typesPath = path.join(geminiCliCorePath, "src/code_assist/types.ts");

  if (!fs.existsSync(converterPath)) {
    console.warn("Skipping schema sync: Could not find converter.ts at", converterPath);
    return;
  }

  const converterContent = fs.readFileSync(converterPath, "utf-8");
  const typesContent = fs.existsSync(typesPath) ? fs.readFileSync(typesPath, "utf-8") : "";

  // Extract interfaces and types using regex
  const schemas = [
    { name: "CAGenerateContentRequest", source: converterContent },
    { name: "VertexGenerateContentRequest", source: converterContent },
    { name: "VertexGenerationConfig", source: converterContent },
    { name: "CaGenerateContentResponse", source: converterContent },
    { name: "VertexGenerateContentResponse", source: converterContent },
    { name: "Credits", source: typesContent },
    { name: "CreditType", source: typesContent, isType: true },
  ];

  let output = `/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// AUTO-GENERATED FROM gemini-cli.
// DO NOT EDIT MANUALLY. Run 'npm run prebuild' to update.

import type { 
  Content, 
  ToolListUnion, 
  ToolConfig, 
  SafetySetting,
  GenerationConfigRoutingConfig,
  ModelSelectionConfig,
  SpeechConfigUnion,
  ThinkingConfig,
  Candidate,
  GenerateContentResponsePromptFeedback,
  GenerateContentResponseUsageMetadata,
  MediaResolution
} from '@google/genai';

`;

  for (const schema of schemas) {
    if (!schema.source) continue;
    
    let match;
    if (schema.isType) {
      const regex = new RegExp(`(?:export\\s+)?type\\s+${schema.name}\\s*=[^;]+;`, "m");
      match = schema.source.match(regex);
      if (match) {
        output += (match[0].startsWith("export") ? "" : "export ") + match[0] + "\n\n";
      }
    } else {
      const regex = new RegExp(`(?:export\\s+)?interface\\s+${schema.name}\\s*{([\\s\\S]*?)^}`, "m");
      match = schema.source.match(regex);
      if (match) {
        output += `export interface ${schema.name} {\n${match[1].trimEnd()}\n}\n\n`;
      }
    }
  }

  const outputDir = "src/generated";
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, "schemas.ts");
  fs.writeFileSync(outputPath, output);
  console.log(`Synced LLM schemas to ${outputPath}`);
}

syncSchemas();
