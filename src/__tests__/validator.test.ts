import { describe, it, expect } from 'vitest';
import { createValidator, sqlPreset } from '../index';
import { FieldMeta } from '../types';

const validate = createValidator(sqlPreset);

const fields: FieldMeta[] = [
  { name: 'value', dataType: 'NUMBER' },
  { name: 'users', dataType: 'NUMBER' },
  { name: 'country', dataType: 'STRING' },
  { name: 'revenue', dataType: 'NUMBER' },
  { name: 'hours', dataType: 'DURATION' },
  { name: 'start_date', dataType: 'DATE' },
  { name: 'end_date', dataType: 'DATE' },
  { name: 'created_at', dataType: 'DATETIME' },
  { name: 'login_time', dataType: 'TIME' },
  { name: 'is_active', dataType: 'BOOLEAN' },
];

// ============================================================
//  Syntax validation
// ============================================================

describe('Syntax validation', () => {
  it('detects unclosed parenthesis', () => {
    const result = validate('SUM(@value', fields);
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe('brackets');
  });

  it('detects invalid operators', () => {
    const result = validate('@value */ @users', fields);
    expect(result.valid).toBe(false);
  });

  it('detects unknown functions', () => {
    const result = validate('SUUM(@value)', fields);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('SUUM');
  });

  it('detects wrong arity', () => {
    const result = validate('ROUND(@value, 2, 1)', fields);
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe('function_arity');
  });

  it('detects invalid characters', () => {
    const result = validate('@value + #users', fields);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('#');
  });

  it('detects extra closing parenthesis', () => {
    const result = validate('@value + @users)', fields);
    expect(result.valid).toBe(false);
  });

  it('parses valid empty parentheses group', () => {
    const result = validate('(@value + @users) * 2', fields);
    expect(result.valid).toBe(true);
  });
});

// ============================================================
//  Semantic validation
// ============================================================

describe('Semantic validation', () => {
  it('detects missing fields', () => {
    const result = validate('@value / @users_cnt', fields);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('users_cnt');
  });

  it('detects type mismatch in operations', () => {
    const result = validate('@country + 1', fields);
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe('type_mismatch');
  });

  it('detects invalid function argument types', () => {
    const result = validate('SUM(@country)', fields);
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe('function_arg_type');
  });

  it('detects aggregate/non-aggregate conflict', () => {
    const result = validate('SUM(@value) / @users', fields);
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe('aggregate_conflict');
  });

  it('detects nested aggregates', () => {
    const result = validate('SUM(AVG(@value))', fields);
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe('nested_aggregates');
  });

  it('allows COUNT on any type', () => {
    const result = validate('COUNT(@country)', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('NUMBER');
  });

  it('allows COUNT on boolean', () => {
    const result = validate('COUNT(@is_active)', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('NUMBER');
  });
});

// ============================================================
//  Type inference (operation matrix)
// ============================================================

describe('Type inference — arithmetic operations', () => {
  it('NUMBER + NUMBER = NUMBER', () => {
    const result = validate('@value + @users', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('NUMBER');
  });

  it('NUMBER * NUMBER = NUMBER', () => {
    const result = validate('@value * 2', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('NUMBER');
  });

  it('DATE - DATE = DURATION', () => {
    const result = validate('@end_date - @start_date', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('DURATION');
  });

  it('DATE + DURATION = DATE', () => {
    const result = validate('@start_date + @hours', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('DATE');
  });

  it('DATETIME - DATETIME = DURATION', () => {
    const result = validate('@created_at - @created_at', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('DURATION');
  });

  it('DURATION + DURATION = DURATION', () => {
    const result = validate('@hours + @hours', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('DURATION');
  });

  it('DURATION / DURATION = NUMBER', () => {
    const result = validate('@hours / @hours', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('NUMBER');
  });

  it('DURATION * NUMBER = DURATION', () => {
    const result = validate('@hours * 2', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('DURATION');
  });

  it('NUMBER * DURATION = DURATION', () => {
    const result = validate('2 * @hours', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('DURATION');
  });

  it('DURATION / NUMBER = DURATION', () => {
    const result = validate('@hours / 2', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('DURATION');
  });

  it('STRING + STRING is not allowed', () => {
    const result = validate('@country + @country', fields);
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe('type_mismatch');
  });

  it('BOOLEAN + anything is not allowed', () => {
    const result = validate('@is_active + 1', fields);
    expect(result.valid).toBe(false);
  });

  it('TIME - TIME = DURATION', () => {
    const result = validate('@login_time - @login_time', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('DURATION');
  });
});

// ============================================================
//  Type inference — aggregation functions
// ============================================================

describe('Type inference — aggregation functions', () => {
  it('SUM(NUMBER) = NUMBER', () => {
    const result = validate('SUM(@value)', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('NUMBER');
  });

  it('SUM(DURATION) = DURATION', () => {
    const result = validate('SUM(@hours)', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('DURATION');
  });

  it('MIN(DATE) = DATE', () => {
    const result = validate('MIN(@start_date)', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('DATE');
  });

  it('MAX(DATETIME) = DATETIME', () => {
    const result = validate('MAX(@created_at)', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('DATETIME');
  });

  it('ROUND(NUMBER) = NUMBER', () => {
    const result = validate('ROUND(@value)', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('NUMBER');
  });

  it('ROUND(NUMBER, 2) = NUMBER', () => {
    const result = validate('ROUND(@value, 2)', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('NUMBER');
  });

  it('ROUND(DURATION) = DURATION', () => {
    const result = validate('ROUND(@hours)', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('DURATION');
  });

  it('ROUND(STRING) is not allowed', () => {
    const result = validate('ROUND(@country)', fields);
    expect(result.valid).toBe(false);
  });

  it('CONCAT returns STRING', () => {
    const result = validate('CONCAT(@country, @country)', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('STRING');
  });
});

// ============================================================
//  Complex expressions
// ============================================================

describe('Complex expressions', () => {
  it('SUM(@value) / SUM(@users) — valid aggregated expression', () => {
    const result = validate('SUM(@value) / SUM(@users)', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('NUMBER');
  });

  it('(SUM(@value) + SUM(@revenue)) / SUM(@users)', () => {
    const result = validate('(SUM(@value) + SUM(@revenue)) / SUM(@users)', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('NUMBER');
  });

  it('nested arithmetic: (@value + @users) * 2 - @revenue', () => {
    const result = validate('(@value + @users) * 2 - @revenue', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('NUMBER');
  });

  it('unary minus: -@value', () => {
    const result = validate('-@value', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('NUMBER');
  });

  it('unary minus in expression: @value * -2', () => {
    const result = validate('@value * -2', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('NUMBER');
  });

  it('decimal numbers: @value / 100.5', () => {
    const result = validate('@value / 100.5', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('NUMBER');
  });

  it('returns AST when valid', () => {
    const result = validate('@value + 1', fields);
    expect(result.valid).toBe(true);
    expect(result.ast).toBeDefined();
    expect(result.ast!.kind).toBe('BinaryOp');
  });
});

// ============================================================
//  Edge cases
// ============================================================

describe('Edge cases', () => {
  it('empty formula', () => {
    const result = validate('', fields);
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe('empty');
  });

  it('whitespace-only formula', () => {
    const result = validate('   ', fields);
    expect(result.valid).toBe(false);
  });

  it('single field', () => {
    const result = validate('@value', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('NUMBER');
  });

  it('single number', () => {
    const result = validate('42', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('NUMBER');
  });

  it('just a function call', () => {
    const result = validate('SUM(@value)', fields);
    expect(result.valid).toBe(true);
  });

  it('multiple errors are reported', () => {
    const result = validate('@nonexistent + @alsoMissing', fields);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
  });
});
