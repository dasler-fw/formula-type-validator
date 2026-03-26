import { FunctionDef, OperationRule, ValidatorConfig } from './types';

// ============================================================
//  SQL preset — standard SQL-like types and aggregate functions
// ============================================================

const SQL_TYPES = {
  NUMBER: 'NUMBER',
  STRING: 'STRING',
  DATE: 'DATE',
  TIME: 'TIME',
  DATETIME: 'DATETIME',
  DURATION: 'DURATION',
  BOOLEAN: 'BOOLEAN',
} as const;

const sqlFunctions: FunctionDef[] = [
  {
    name: 'SUM',
    arity: [1, 1],
    allowedArgTypes: ['NUMBER', 'DURATION'],
    isAggregate: true,
    resultTypeMap: { NUMBER: 'NUMBER', DURATION: 'DURATION' },
  },
  {
    name: 'AVG',
    arity: [1, 1],
    allowedArgTypes: ['NUMBER', 'DURATION'],
    isAggregate: true,
    resultTypeMap: { NUMBER: 'NUMBER', DURATION: 'DURATION' },
  },
  {
    name: 'MIN',
    arity: [1, 1],
    allowedArgTypes: ['NUMBER', 'DATE', 'TIME', 'DATETIME', 'DURATION'],
    isAggregate: true,
    resultTypeMap: {
      NUMBER: 'NUMBER',
      DATE: 'DATE',
      TIME: 'TIME',
      DATETIME: 'DATETIME',
      DURATION: 'DURATION',
    },
  },
  {
    name: 'MAX',
    arity: [1, 1],
    allowedArgTypes: ['NUMBER', 'DATE', 'TIME', 'DATETIME', 'DURATION'],
    isAggregate: true,
    resultTypeMap: {
      NUMBER: 'NUMBER',
      DATE: 'DATE',
      TIME: 'TIME',
      DATETIME: 'DATETIME',
      DURATION: 'DURATION',
    },
  },
  {
    name: 'COUNT',
    arity: [1, 1],
    allowedArgTypes: ['*'],
    isAggregate: true,
    resultTypeMap: { '*': 'NUMBER' },
  },
  {
    name: 'AVERAGE',
    arity: [1, 1],
    allowedArgTypes: ['NUMBER', 'DURATION'],
    isAggregate: true,
    resultTypeMap: { NUMBER: 'NUMBER', DURATION: 'DURATION' },
  },
  {
    name: 'ROUND',
    arity: [1, 2],
    allowedArgTypes: ['NUMBER', 'DURATION'],
    isAggregate: false,
    resultTypeMap: { NUMBER: 'NUMBER', DURATION: 'DURATION' },
  },
  {
    name: 'CONCAT',
    arity: [1, Infinity],
    allowedArgTypes: ['*'],
    isAggregate: false,
    resultTypeMap: { '*': 'STRING' },
  },
];

/**
 * Build operation rules from a compact matrix definition.
 * Each entry: [leftType, rightType, '+' result, '-' result, '*' result, '/' result]
 * null means the operation is not allowed.
 */
const opMatrix: [string, string, string | null, string | null, string | null, string | null][] = [
  // NUMBER combinations
  ['NUMBER',   'NUMBER',   'NUMBER',   'NUMBER',   'NUMBER',   'NUMBER'],
  ['NUMBER',   'DURATION', null,       null,       'DURATION', null],

  // STRING — no arithmetic at all
  // (no entries = all null)

  // DATE combinations
  ['DATE',     'DATE',     null,       'DURATION', null,       null],
  ['DATE',     'TIME',     'DATETIME', 'DATETIME', null,       null],
  ['DATE',     'DURATION', 'DATE',     'DATETIME', null,       null],
  ['DATE',     'NUMBER',   'DATE',     'DATE',     null,       null],

  // DATETIME combinations
  ['DATETIME', 'DATETIME', null,       'DURATION', null,       null],
  ['DATETIME', 'DATE',     null,       'DURATION', null,       null],
  ['DATETIME', 'TIME',     null,       'DATETIME', null,       null],
  ['DATETIME', 'DURATION', 'DATETIME', 'DATETIME', null,       null],

  // TIME combinations
  ['TIME',     'TIME',     null,       'DURATION', null,       null],
  ['TIME',     'DATE',     'DATETIME', null,       null,       null],
  ['TIME',     'DATETIME', 'DATETIME', null,       null,       null],
  ['TIME',     'DURATION', 'TIME',     'DURATION', null,       null],
  ['TIME',     'NUMBER',   null,       null,       'DURATION', 'DURATION'],

  // DURATION combinations
  ['DURATION', 'DURATION', 'DURATION', 'DURATION', null,       'NUMBER'],
  ['DURATION', 'NUMBER',   null,       null,       'DURATION', 'DURATION'],
  ['DURATION', 'DATE',     null,       null,       null,       null],
  ['DURATION', 'DATETIME', null,       null,       null,       null],
  ['DURATION', 'TIME',     null,       null,       null,       null],

  // BOOLEAN — no arithmetic
  // (no entries)
];

const operators: ('+' | '-' | '*' | '/')[] = ['+', '-', '*', '/'];

const sqlOperationRules: OperationRule[] = [];
for (const [left, right, add, sub, mul, div] of opMatrix) {
  const results = [add, sub, mul, div];
  for (let i = 0; i < 4; i++) {
    if (results[i]) {
      sqlOperationRules.push({
        left,
        right,
        operator: operators[i],
        resultType: results[i]!,
      });
    }
  }
}

/**
 * SQL-like preset with 7 data types (NUMBER, STRING, DATE, TIME, DATETIME, DURATION, BOOLEAN),
 * standard aggregate functions (SUM, AVG, MIN, MAX, COUNT), and a full arithmetic type matrix.
 *
 * Suitable for BI tools, dashboard builders, report generators, and similar applications.
 */
export const sqlPreset: ValidatorConfig = {
  functions: sqlFunctions,
  operationRules: sqlOperationRules,
  fieldPrefix: '@',
};

/** Exported type constants for convenience */
export const SQL_DATA_TYPES = SQL_TYPES;
