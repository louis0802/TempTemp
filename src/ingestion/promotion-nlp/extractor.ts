import { PROMPT_VERSION } from "./prompt";
import { SCHEMA_VERSION, promotionTextEvidenceSchema } from "./schema";
import { validatePromotionExtraction } from "./validator";
import type { PromotionNlpProvider, PromotionTextEvidence } from "./types";

export async function extractPromotionFacts(
  provider: PromotionNlpProvider,
  evidence: PromotionTextEvidence,
) {
  const input = promotionTextEvidenceSchema.parse(evidence);
  const requestedAt = new Date().toISOString();
  const raw = await provider.extract(input);
  return {
    raw,
    validated: validatePromotionExtraction(input, raw),
    metadata: { ...provider.metadata, requestedAt },
  };
}

/** Checked structured outputs, not expected gold generated at evaluation time. */
export class FixturePromotionNlpProvider implements PromotionNlpProvider {
  readonly metadata = {
    provider: "fixture",
    model: "checked-contract-replay-v1",
    promptVersion: PROMPT_VERSION,
    schemaVersion: SCHEMA_VERSION,
  };
  constructor(private readonly outputs: Readonly<Record<string, unknown>>) {}
  async extract(evidence: PromotionTextEvidence): Promise<unknown> {
    const input = promotionTextEvidenceSchema.parse(evidence);
    const key = `${input.evidenceId}:${input.nativeId ?? ""}`;
    if (!Object.hasOwn(this.outputs, key))
      throw new Error("fixture_output_missing");
    return structuredClone(this.outputs[key]);
  }
}
