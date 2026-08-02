import { z } from 'zod';

export const SchemaVersionSchema = z.string().refine((val) => {
  const major = val.split('.')[0];
  return major === '1';
}, {
  message: 'Unsupported schema version. Only version 1.x is supported.'
});

export function validateSchemaVersion(payload: { schema_version?: string }): boolean {
  if (!payload || !payload.schema_version) {
    throw new Error('Payload missing schema_version');
  }
  const result = SchemaVersionSchema.safeParse(payload.schema_version);
  if (!result.success) {
    throw new Error(`Schema version rejection: ${result.error.issues[0]?.message}`);
  }
  return true;
}
