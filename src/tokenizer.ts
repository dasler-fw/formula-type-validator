import { ValidationError } from './types';

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

export const tokenize = (
  input: string,
  fieldPrefix = '@',
): { tokens: Token[]; errors: ValidationError[] } => {
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

    // Field references: @fieldName
    if (ch === fieldPrefix) {
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

    // Identifiers (function names)
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
