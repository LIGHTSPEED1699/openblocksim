export interface PortLabels {
  inputs: string[];
  outputs: string[];
}

/**
 * Resolve the display label for every input and output port of a node.
 * Explicit BlockMeta.portLabels (input-only, one string per input) override
 * the defaults; outputs are always derived (y / y1..yN) — no block today
 * needs a distinct output name. 0-count blocks (Comment) yield empty arrays.
 */
export function resolvePortLabels(
  inputCount: number,
  outputCount: number,
  portLabels?: string[],
): PortLabels {
  const inputs = Array.from({ length: inputCount }, (_, i) =>
    portLabels?.[i] ?? (inputCount === 1 ? 'u' : `in${i + 1}`),
  );
  const outputs = Array.from({ length: outputCount }, (_, i) =>
    outputCount === 1 ? 'y' : `y${i + 1}`,
  );
  return { inputs, outputs };
}
