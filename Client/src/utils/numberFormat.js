export const formatDecimal = (value, fallback = '-') => {
  if (value === null || value === undefined || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : fallback;
};
