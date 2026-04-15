export interface Scale {
  divisor: number;
  unit: string;
}

export function pickScale(maxValue: number): Scale {
  if (maxValue >= 1e6) return { divisor: 1e6, unit: "Millions" };
  if (maxValue >= 1e3) return { divisor: 1e3, unit: "Thousands" };
  return { divisor: 1, unit: "" };
}

export function scale(data: number[], divisor: number): number[] {
  return divisor === 1 ? data : data.map((v) => v / divisor);
}
