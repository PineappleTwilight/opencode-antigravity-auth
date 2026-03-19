/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// AUTO-GENERATED FROM gemini-cli/packages/core/src/code_assist/converter.ts
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

export interface CAGenerateContentRequest {

  model: string;
  project?: string;
  user_prompt_id?: string;
  request: VertexGenerateContentRequest;
  enabled_credit_types?: string[];
}

export interface VertexGenerateContentRequest {

  contents: Content[];
  systemInstruction?: Content;
  cachedContent?: string;
  tools?: ToolListUnion;
  toolConfig?: ToolConfig;
  labels?: Record<string, string>;
  safetySettings?: SafetySetting[];
  generationConfig?: VertexGenerationConfig;
  session_id?: string;
}

export interface VertexGenerationConfig {

  temperature?: number;
  topP?: number;
  topK?: number;
  candidateCount?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
  responseLogprobs?: boolean;
  logprobs?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  seed?: number;
  responseMimeType?: string;
  responseJsonSchema?: unknown;
  responseSchema?: unknown;
  routingConfig?: GenerationConfigRoutingConfig;
  modelSelectionConfig?: ModelSelectionConfig;
  responseModalities?: string[];
  mediaResolution?: MediaResolution;
  speechConfig?: SpeechConfigUnion;
  audioTimestamp?: boolean;
  thinkingConfig?: ThinkingConfig;
}

export interface CaGenerateContentResponse {

  response?: VertexGenerateContentResponse;
  traceId?: string;
  consumedCredits?: Credits[];
  remainingCredits?: Credits[];
}

export interface VertexGenerateContentResponse {

  candidates?: Candidate[];
  automaticFunctionCallingHistory?: Content[];
  promptFeedback?: GenerateContentResponsePromptFeedback;
  usageMetadata?: GenerateContentResponseUsageMetadata;
  modelVersion?: string;
}

export interface Credits {

  creditType: CreditType;
  creditAmount: string; // int64 represented as string in JSON
}

export type CreditType = 'CREDIT_TYPE_UNSPECIFIED' | 'GOOGLE_ONE_AI';

