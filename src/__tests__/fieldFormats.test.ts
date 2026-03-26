import { describe, it, expect } from 'vitest';
import { createValidator, sqlPreset } from '../index';
import { FieldMeta } from '../types';

const fields: FieldMeta[] = [
  { name: 'revenue', dataType: 'NUMBER' },
  { name: 'hours', dataType: 'DURATION' },
  { name: 'country', dataType: 'STRING' },
  { name: 'start_date', dataType: 'DATE' },
];

// ============================================================
//  'quoted' field format: "fieldName"
// ============================================================

describe('Field format: quoted', () => {
  const validate = createValidator({ ...sqlPreset, fieldFormat: 'quoted' });

  it('basic quoted field', () => {
    const result = validate('"revenue"', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('NUMBER');
  });

  it('quoted field in arithmetic', () => {
    const result = validate('"revenue" + "revenue"', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('NUMBER');
  });

  it('quoted field in function call: sum("revenue")', () => {
    const result = validate('sum("revenue")', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('NUMBER');
  });

  it('lowercase function names work: avg("revenue")', () => {
    const result = validate('avg("revenue")', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('NUMBER');
  });

  it('complex: sum("revenue") / sum("revenue")', () => {
    const result = validate('sum("revenue") / sum("revenue")', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('NUMBER');
  });

  it('mixed: (sum("revenue") + 100) * 2', () => {
    const result = validate('(sum("revenue") + 100) * 2', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('NUMBER');
  });

  it('type inference: "start_date" - "start_date" = DURATION', () => {
    const result = validate('"start_date" - "start_date"', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('DURATION');
  });

  it('detects missing field in quoted format', () => {
    const result = validate('sum("nonexistent")', fields);
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe('field_exists');
  });

  it('detects type mismatch in quoted format', () => {
    const result = validate('"country" + 1', fields);
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe('type_mismatch');
  });

  it('detects aggregate conflict in quoted format', () => {
    const result = validate('sum("revenue") / "revenue"', fields);
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe('aggregate_conflict');
  });

  it('detects unclosed quote', () => {
    const result = validate('sum("revenue)', fields);
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe('unclosed_quote');
  });

  it('rejects @-prefixed fields in quoted mode', () => {
    const result = validate('@revenue + 1', fields);
    expect(result.valid).toBe(false);
  });

  it('round with quoted field: round("revenue", 2)', () => {
    const result = validate('round("revenue", 2)', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('NUMBER');
  });

  it('full dashboard formula: (sum("revenue") + sum("revenue")) / count("country")', () => {
    const result = validate(
      '(sum("revenue") + sum("revenue")) / count("country")',
      fields,
    );
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('NUMBER');
  });
});

// ============================================================
//  'none' field format: bare identifiers
// ============================================================

describe('Field format: none', () => {
  const validate = createValidator({ ...sqlPreset, fieldFormat: 'none' });

  it('bare identifier as field', () => {
    const result = validate('revenue', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('NUMBER');
  });

  it('bare fields in arithmetic: revenue + revenue', () => {
    const result = validate('revenue + revenue', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('NUMBER');
  });

  it('function call with bare field: SUM(revenue)', () => {
    const result = validate('SUM(revenue)', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('NUMBER');
  });

  it('complex: (SUM(revenue) + 100) / SUM(revenue)', () => {
    const result = validate('(SUM(revenue) + 100) / SUM(revenue)', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('NUMBER');
  });

  it('detects missing field', () => {
    const result = validate('revenue + nonexistent', fields);
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe('field_exists');
  });

  it('distinguishes functions from fields', () => {
    // SUM is a function, revenue is a field
    const result = validate('SUM(revenue) / COUNT(country)', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('NUMBER');
  });

  it('function without parens is still an error', () => {
    const result = validate('SUM + revenue', fields);
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe('function_no_parens');
  });
});

// ============================================================
//  'prefix' format (default) — backwards compatible
// ============================================================

describe('Field format: prefix (default)', () => {
  const validate = createValidator(sqlPreset);

  it('still works with @-prefix', () => {
    const result = validate('SUM(@revenue) + 1', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('NUMBER');
  });

  it('custom prefix: $', () => {
    const validate$ = createValidator({
      ...sqlPreset,
      fieldFormat: 'prefix',
      fieldPrefix: '$',
    });
    const result = validate$('SUM($revenue)', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('NUMBER');
  });
});
