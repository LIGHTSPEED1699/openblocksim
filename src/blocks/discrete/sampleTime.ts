// True when t is (numerically) a multiple of the sample period Ts.
// Discrete blocks sample their inputs and update their registers only on
// sample times; between sample times they hold their last output (ZOH).
export function isSampleTime(t: number, sampleTime: number): boolean {
  const ratio = t / sampleTime;
  return Math.abs(ratio - Math.round(ratio)) < 1e-6;
}
