import { z } from "zod";
import {
  PROMOTION_NLP_PROMPT,
  PROMPT_VERSION,
  promotionPromptInput,
} from "./prompt";
import { extractionJsonSchema, SCHEMA_VERSION } from "./schema";
import type { PromotionNlpProvider, PromotionTextEvidence } from "./types";

const configSchema = z.strictObject({
  apiKey: z.string().min(1),
  model: z
    .string()
    .regex(/^[a-zA-Z0-9._:-]+$/)
    .max(160),
  timeoutMs: z.number().int().min(1).max(60_000).default(45_000),
  maxOutputTokens: z.number().int().min(256).max(8192).default(4096),
  temperature: z.number().min(0).max(0.2).nullable().default(0),
});
export type HostedProviderConfig = z.input<typeof configSchema>;
export function hostedConfigFromEnvironment(
  env: Readonly<Record<string, string | undefined>> = process.env,
): HostedProviderConfig {
  if (!env.PROMOTION_NLP_OPENAI_API_KEY && !env.OPENAI_API_KEY)
    throw new Error("promotion_nlp_credentials_absent");
  if (!env.PROMOTION_NLP_MODEL)
    throw new Error("promotion_nlp_model_unconfigured");
  return configSchema.parse({
    apiKey: env.PROMOTION_NLP_OPENAI_API_KEY || env.OPENAI_API_KEY,
    model: env.PROMOTION_NLP_MODEL,
    timeoutMs: env.PROMOTION_NLP_TIMEOUT_MS
      ? Number(env.PROMOTION_NLP_TIMEOUT_MS)
      : undefined,
    maxOutputTokens: env.PROMOTION_NLP_MAX_OUTPUT_TOKENS
      ? Number(env.PROMOTION_NLP_MAX_OUTPUT_TOKENS)
      : undefined,
    temperature:
      env.PROMOTION_NLP_TEMPERATURE === "omit"
        ? null
        : env.PROMOTION_NLP_TEMPERATURE
          ? Number(env.PROMOTION_NLP_TEMPERATURE)
          : undefined,
  });
}
const responseSchema = z.object({
  status: z.literal("completed"),
  output: z.array(
    z.object({
      type: z.string(),
      content: z
        .array(z.object({ type: z.string(), text: z.string().optional() }))
        .optional(),
    }),
  ),
});
export class OpenAiPromotionNlpProvider implements PromotionNlpProvider {
  readonly metadata;
  private readonly config;
  constructor(
    config: HostedProviderConfig,
    private readonly transport: typeof fetch = fetch,
  ) {
    this.config = configSchema.parse(config);
    this.metadata = {
      provider: "openai-responses",
      model: this.config.model,
      promptVersion: PROMPT_VERSION,
      schemaVersion: SCHEMA_VERSION,
    };
  }
  /** Only safe configuration can enter artifacts. API keys and vendor error bodies never do. */
  get settings() {
    return {
      timeoutMs: this.config.timeoutMs,
      maxOutputTokens: this.config.maxOutputTokens,
      temperature: this.config.temperature,
      retries: 0,
    };
  }
  async extract(evidence: PromotionTextEvidence): Promise<unknown> {
    const input = promotionPromptInput(evidence);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await this.transport(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",
          redirect: "error",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.config.model,
            instructions: PROMOTION_NLP_PROMPT,
            input,
            store: false,
            max_output_tokens: this.config.maxOutputTokens,
            ...(this.config.temperature === null
              ? {}
              : { temperature: this.config.temperature }),
            text: {
              format: {
                type: "json_schema",
                name: "promotion_extraction",
                strict: true,
                schema: extractionJsonSchema(),
              },
            },
          }),
        },
      );
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`promotion_nlp_http_${response.status}`);
      }
      if (Number(response.headers.get("content-length") ?? 0) > 200_000) {
        await response.body?.cancel();
        throw new Error("promotion_nlp_response_too_large");
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("promotion_nlp_empty_response");
      const chunks: Uint8Array[] = [];
      let total = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.length;
          if (total > 200_000) {
            await reader.cancel();
            throw new Error("promotion_nlp_response_too_large");
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      const payload = responseSchema.safeParse(
        JSON.parse(Buffer.concat(chunks).toString("utf8")),
      );
      if (!payload.success)
        throw new Error("promotion_nlp_incomplete_or_malformed_response");
      const content = payload.data.output
        .filter((o) => o.type === "message")
        .flatMap((o) => o.content ?? []);
      if (content.some((c) => c.type === "refusal"))
        throw new Error("promotion_nlp_refusal");
      const outputs = content.filter((c) => c.type === "output_text");
      if (outputs.length !== 1 || !outputs[0].text)
        throw new Error("promotion_nlp_output_missing_or_multiple");
      if (Buffer.byteLength(outputs[0].text) > 100_000)
        throw new Error("promotion_nlp_output_too_large");
      return JSON.parse(outputs[0].text);
    } catch (error) {
      if (controller.signal.aborted) throw new Error("promotion_nlp_timeout");
      if (
        error instanceof Error &&
        /^promotion_nlp_[a-z_0-9]+$/.test(error.message)
      )
        throw error;
      throw new Error("promotion_nlp_transport_or_json_failure");
    } finally {
      clearTimeout(timer);
    }
  }
}
