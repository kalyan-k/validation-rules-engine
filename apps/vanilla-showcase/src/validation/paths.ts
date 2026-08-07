export function getPropertyValue(model: unknown, propertyPath: string): unknown {
  return propertyPath.split('.').filter(Boolean).reduce<unknown>((value, segment) => {
    if (value === null || value === undefined || typeof value !== 'object') return undefined;
    return (value as Record<string, unknown>)[segment];
  }, model);
}

export function setPropertyValue(model: Record<string, unknown>, propertyPath: string, value: unknown): void {
  const segments = propertyPath.split('.').filter(Boolean);
  if (segments.length === 0) return;

  let current: Record<string, unknown> | unknown[] = model;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const seg = segments[i]!;
    const nextSeg = segments[i + 1]!;
    const container = current as Record<string, unknown>;
    if (container[seg] == null || typeof container[seg] !== 'object') {
      container[seg] = /^\d+$/u.test(nextSeg) ? [] : {};
    }
    current = container[seg] as Record<string, unknown> | unknown[];
  }
  (current as Record<string, unknown>)[segments[segments.length - 1]!] = value;
}

export function fieldId(propertyPath: string): string {
  return `validation-field-${propertyPath.replace(/[^a-z0-9_-]+/giu, '-')}`;
}
