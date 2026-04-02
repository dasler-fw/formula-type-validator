import { ValidatorConfig, FieldMeta, ValidationResult } from './types';
import { tokenize } from './tokenizer';
import { Parser } from './parser';
import { createTypeChecker } from './semanticValidator';

/**
 * Creates a formula validator with the given configuration.
 *
 * @example
 * ```ts
 * import { createValidator, sqlPreset } from 'formula-type-validator';
 *
 * const validate = createValidator(sqlPreset);
 *
 * const result = validate('SUM(@revenue) / SUM(@hours)', [
 *   { name: 'revenue', dataType: 'NUMBER' },
 *   { name: 'hours', dataType: 'DURATION' },
 * ]);
 * ```
 *
 * @example
 * ```ts
 * // Quoted field format: sum("revenue") / "count"
 * const validate = createValidator({ ...sqlPreset, fieldFormat: 'quoted' });
 * const result = validate('sum("revenue") / sum("hours")', fields);
 * ```
 */
export const createValidator = (config: ValidatorConfig) => {
  const { functions, operationRules, fieldFormat = 'prefix', fieldPrefix = '@' } = config;
  const typeChecker = createTypeChecker(functions, operationRules);

  return (formula: string, availableFields: FieldMeta[]): ValidationResult => {
    if (!formula.trim()) {
      return {
        valid: false,
        errors: [{ level: 'syntax', rule: 'empty', message: 'Формула пуста' }],
      };
    }

    // 1. Tokenize
    const { tokens, errors: lexErrors } = tokenize(formula, { fieldFormat, fieldPrefix });
    if (lexErrors.length > 0) {
      return { valid: false, errors: lexErrors };
    }

    // 2. Parse into AST
    const parser = new Parser(tokens, functions, fieldFormat);
    const ast = parser.parse();
    if (parser.errors.length > 0) {
      return { valid: false, errors: parser.errors };
    }
    if (!ast) {
      return {
        valid: false,
        errors: [{ level: 'syntax', rule: 'empty', message: 'Формула пуста' }],
      };
    }

    // 3. Semantic validation + type inference
    const { errors: semErrors, resultType } = typeChecker(ast, availableFields);
    if (semErrors.length > 0) {
      return { valid: false, errors: semErrors, ast };
    }

    return {
      valid: true,
      errors: [],
      resultType: resultType ?? undefined,
      ast,
    };
  };
};
