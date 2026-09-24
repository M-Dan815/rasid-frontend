export function fmtSAR(n: number): string {
  const neg = n < 0;
  const v = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return (neg ? "\u2212" : "") + v + " SAR";
}
