import { ValidationError, FieldFormat } from './types';

export enum TokenType {
  Number = 'Number',
  Field = 'Field',
  Ident = 'Ident',
  Operator = 'Operator',
  LParen = 'LParen',
  RParen = 'RParen',
  Comma = 'Comma',
}

export interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

const WHITESPACE = /\s/;
const DIGIT = /\d/;
const IDENT_START = /[a-zA-Z_]/;
const IDENT_CHAR = /\w/;
const OPERATORS = new Set(['+', '-', '*', '/']);

export interface TokenizerOptions {
  fieldFormat: FieldFormat;
  fieldPrefix: string;
}

export const tokenize = (
  input: string,
  options: TokenizerOptions = { fieldFormat: 'prefix', fieldPrefix: '@' },
): { tokens: Token[]; errors: ValidationError[] } => {
  const { fieldFormat, fieldPrefix } = options;
  const tokens: Token[] = [];
  const errors: ValidationError[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (WHITESPACE.test(ch)) {
      i++;
      continue;
    }

    // Numbers (integer and decimal)
    if (DIGIT.test(ch)) {
      const start = i;
      while (i < input.length && DIGIT.test(input[i])) i++;
      if (i < input.length && input[i] === '.') {
        i++;
        while (i < input.length && DIGIT.test(input[i])) i++;
      }
      tokens.push({ type: TokenType.Number, value: input.slice(start, i), pos: start });
      continue;
    }

    // Quoted strings → Field tokens (in 'quoted' mode)
    if (ch === '"') {
      const start = i;
      i++; // skip opening quote
      const nameStart = i;
      while (i < input.length && input[i] !== '"') i++;
      if (i >= input.length) {
        errors.push({
          level: 'syntax',
          rule: 'unclosed_quote',
          message: 'Unclosed quoted string',
          position: start,
        });
        continue;
      }
      const rawName = input.slice(nameStart, i);
      i++; // skip closing quote

      if (fieldFormat === 'quoted') {
        // In quoted mode, quoted strings are field references.
        // Strip the configured prefix if present (e.g. "@revenue" → "revenue").
        const name =
          fieldPrefix && rawName.startsWith(fieldPrefix)
            ? rawName.slice(fieldPrefix.length)
            : rawName;
        tokens.push({ type: TokenType.Field, value: name, pos: start });
      } else {
        // In other modes, quoted strings are not expected
        errors.push({
          level: 'syntax',
          rule: 'invalid_token',
          message: `Unexpected quoted string "${rawName}". Use ${fieldPrefix}${rawName} to reference fields`,
          position: start,
        });
      }
      continue;
    }

    // Prefix field references: @fieldName (only in 'prefix' mode)
    if (fieldFormat === 'prefix' && ch === fieldPrefix) {
      const start = i;
      i++;
      if (i < input.length && IDENT_START.test(input[i])) {
        const nameStart = i;
        while (i < input.length && IDENT_CHAR.test(input[i])) i++;
        tokens.push({
          type: TokenType.Field,
          value: input.slice(nameStart, i),
          pos: start,
        });
      } else {
        errors.push({
          level: 'syntax',
          rule: 'invalid_token',
          message: `Expected field name after "${fieldPrefix}"`,
          position: start,
        });
      }
      continue;
    }

    // Identifiers (function names, or field names in 'none' mode)
    if (IDENT_START.test(ch)) {
      const start = i;
      while (i < input.length && IDENT_CHAR.test(input[i])) i++;
      tokens.push({ type: TokenType.Ident, value: input.slice(start, i), pos: start });
      continue;
    }

    // Operators
    if (OPERATORS.has(ch)) {
      tokens.push({ type: TokenType.Operator, value: ch, pos: i });
      i++;
      continue;
    }

    // Parentheses
    if (ch === '(') {
      tokens.push({ type: TokenType.LParen, value: ch, pos: i });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: TokenType.RParen, value: ch, pos: i });
      i++;
      continue;
    }

    // Comma
    if (ch === ',') {
      tokens.push({ type: TokenType.Comma, value: ch, pos: i });
      i++;
      continue;
    }

    // Invalid character
    errors.push({
      level: 'syntax',
      rule: 'invalid_token',
      message: `Invalid character "${ch}": check the formula`,
      position: i,
    });
    i++;
  }

  return { tokens, errors };
};
