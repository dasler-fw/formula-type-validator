import { describe, it, expect } from 'vitest';
import { createValidator, sqlPreset, ru } from '../index';
import { FieldMeta } from '../types';

const fields: FieldMeta[] = [
  { name: 'revenue', dataType: 'NUMBER' },
  { name: 'country', dataType: 'STRING' },
];

describe('i18n messages', () => {
  it('uses English messages by default', () => {
    const validate = createValidator(sqlPreset);
    const result = validate('', fields);
    expect(result.errors[0].message).toBe('Formula is empty');
  });

  it('uses Russian messages when configured', () => {
    const validate = createValidator({ ...sqlPreset, messages: ru });
    const result = validate('', fields);
    expect(result.errors[0].message).toBe('Формула пуста');
  });

  it('Russian: unknown field', () => {
    const validate = createValidator({ ...sqlPreset, messages: ru });
    const result = validate('SUM(@missing)', fields);
    expect(result.errors[0].message).toContain('не найдено');
  });

  it('Russian: type mismatch', () => {
    const validate = createValidator({ ...sqlPreset, messages: ru });
    const result = validate('@country + 1', fields);
    expect(result.errors[0].message).toContain('Нельзя');
  });

  it('Russian: unknown function', () => {
    const validate = createValidator({ ...sqlPreset, messages: ru });
    const result = validate('FAKE(@revenue)', fields);
    expect(result.errors[0].message).toContain('Неизвестная функция');
  });

  it('Russian: unclosed parenthesis', () => {
    const validate = createValidator({ ...sqlPreset, messages: ru });
    const result = validate('SUM(@revenue', fields);
    expect(result.errors[0].message).toContain('Незакрытая скобка');
  });

  it('Russian: invalid character', () => {
    const validate = createValidator({ ...sqlPreset, messages: ru });
    const result = validate('@revenue & 1', fields);
    expect(result.errors[0].message).toContain('Недопустимый символ');
  });
});
