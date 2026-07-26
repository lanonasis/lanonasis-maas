export const getScalarRouteParam = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
