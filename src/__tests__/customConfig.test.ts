import { describe, it, expect } from 'vitest';
import { createValidator } from '../index';
import { ValidatorConfig, FieldMeta } from '../types';

// Example: a simple spreadsheet-like config with only NUMBER and STRING
const spreadsheetConfig: ValidatorConfig = {
  functions: [
    {
      name: 'SUM',
      arity: [1, 1],
      allowedArgTypes: ['NUMBER'],
      isAggregate: true,
      resultTypeMap: { NUMBER: 'NUMBER' },
    },
    {
      name: 'LEN',
      arity: [1, 1],
      allowedArgTypes: ['STRING'],
      isAggregate: false,
      resultTypeMap: { STRING: 'NUMBER' },
    },
    {
      name: 'UPPER',
      arity: [1, 1],
      allowedArgTypes: ['STRING'],
      isAggregate: false,
      resultTypeMap: { STRING: 'STRING' },
    },
  ],
  operationRules: [
    { left: 'NUMBER', right: 'NUMBER', operator: '+', resultType: 'NUMBER' },
    { left: 'NUMBER', right: 'NUMBER', operator: '-', resultType: 'NUMBER' },
    { left: 'NUMBER', right: 'NUMBER', operator: '*', resultType: 'NUMBER' },
    { left: 'NUMBER', right: 'NUMBER', operator: '/', resultType: 'NUMBER' },
  ],
  fieldPrefix: '$',
};

const validate = createValidator(spreadsheetConfig);

const fields: FieldMeta[] = [
  { name: 'price', dataType: 'NUMBER' },
  { name: 'quantity', dataType: 'NUMBER' },
  { name: 'label', dataType: 'STRING' },
];

describe('Custom configuration', () => {
  it('uses custom field prefix $', () => {
    const result = validate('$price + $quantity', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('NUMBER');
  });

  it('rejects @ prefix when $ is configured', () => {
    const result = validate('@price + @quantity', fields);
    expect(result.valid).toBe(false);
  });

  it('custom function LEN works', () => {
    const result = validate('LEN($label)', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('NUMBER');
  });

  it('rejects functions not in config', () => {
    const result = validate('AVG($price)', fields);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('AVG');
  });

  it('STRING + STRING not allowed with this config', () => {
    const result = validate('$label + $label', fields);
    expect(result.valid).toBe(false);
  });

  it('custom function UPPER returns STRING', () => {
    const result = validate('UPPER($label)', fields);
    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('STRING');
  });

  it('LEN on NUMBER is not allowed', () => {
    const result = validate('LEN($price)', fields);
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe('function_arg_type');
  });
});
