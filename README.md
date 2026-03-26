# formula-type-validator

[![npm version](https://img.shields.io/npm/v/formula-type-validator?color=cb3837&logo=npm)](https://www.npmjs.com/package/formula-type-validator)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](https://www.npmjs.com/package/formula-type-validator)
[![Bundle Size](https://img.shields.io/badge/bundle-~19kb-blue)](https://www.npmjs.com/package/formula-type-validator)

Type-aware formula validator that parses mathematical expressions into an AST, checks syntax and semantics, and **infers the result data type** based on configurable type matrices.

Built for BI tools, dashboard builders, report engines, spreadsheet apps, or any system where users write calculated field expressions with typed data.

## Why?

When users write formulas like `SUM(@revenue) / SUM(@hours)`, you need to answer:

1. **Is the syntax valid?** (balanced parentheses, known functions, correct arity)
2. **Is it semantically correct?** (do the fields exist? can you divide NUMBER by DURATION?)
3. **What type does the result have?** (NUMBER? DURATION? DATE?)

Doing this with regex is a nightmare to maintain. This library gives you a proper parser with a configurable type system instead.

## Features

- **Zero dependencies** - no external packages, ~19kb bundle
- **Full AST parser** - recursive descent with operator precedence
- **Configurable type system** - define your own types, functions, and operation rules
- **Type inference** - computes the result type of any valid expression
- **SQL preset included** - 7 data types, 8 functions, full arithmetic matrix out of the box
- **Detailed errors** - level (syntax/semantic), rule name, human-readable message, character position
- **Tree-shakeable** - ESM + CJS dual exports

## Install

```bash
npm install formula-type-validator
```

## Quick Start

```typescript
import { createValidator, sqlPreset } from 'formula-type-validator';

const validate = createValidator(sqlPreset);

const fields = [
  { name: 'revenue', dataType: 'NUMBER' },
  { name: 'hours',   dataType: 'DURATION' },
  { name: 'country', dataType: 'STRING' },
  { name: 'start',   dataType: 'DATE' },
  { name: 'end',     dataType: 'DATE' },
];

// Valid expression with type inference
validate('SUM(@revenue) / SUM(@revenue)', fields);
// { valid: true, resultType: 'NUMBER', errors: [], ast: {...} }

// Date arithmetic
validate('@end - @start', fields);
// { valid: true, resultType: 'DURATION', errors: [] }

// Type mismatch
validate('@country + 1', fields);
// { valid: false, errors: [{ level: 'semantic', rule: 'type_mismatch',
//   message: 'Cannot add STRING and NUMBER' }] }

// Unknown function
validate('SUUM(@revenue)', fields);
// { valid: false, errors: [{ level: 'syntax', rule: 'function_name',
//   message: 'Unknown function "SUUM"' }] }
```

## Examples

### Dashboard: calculated fields

Users create computed columns with aggregation functions and field references:

```typescript
import { createValidator, sqlPreset } from 'formula-type-validator';

const validate = createValidator({ ...sqlPreset, fieldFormat: 'quoted' });

const fields = [
  { name: 'revenue',    dataType: 'NUMBER' },
  { name: 'cost',       dataType: 'NUMBER' },
  { name: 'hours',      dataType: 'DURATION' },
  { name: 'department', dataType: 'STRING' },
  { name: 'hire_date',  dataType: 'DATE' },
  { name: 'end_date',   dataType: 'DATE' },
];

validate('sum("revenue") - sum("cost")', fields);
// ✓ valid, resultType: 'NUMBER'

validate('sum("revenue") / count("department")', fields);
// ✓ valid, resultType: 'NUMBER'  — revenue per department

validate('round(sum("revenue") / sum("cost"), 2)', fields);
// ✓ valid, resultType: 'NUMBER'  — profit margin rounded to 2 decimals

validate('"end_date" - "hire_date"', fields);
// ✓ valid, resultType: 'DURATION'  — tenure

validate('sum("revenue") / "cost"', fields);
// ✗ Missing aggregate function for field "cost"

validate('sum("department")', fields);
// ✗ Function SUM is not applicable to type STRING

validate('summ("revenue")', fields);
// ✗ Unknown function "summ"
```

### Spreadsheet: simple arithmetic

No prefixes, no quotes — bare field names, spreadsheet-style:

```typescript
const validate = createValidator({ ...sqlPreset, fieldFormat: 'none' });

const fields = [
  { name: 'price',    dataType: 'NUMBER' },
  { name: 'quantity', dataType: 'NUMBER' },
  { name: 'tax',      dataType: 'NUMBER' },
  { name: 'label',    dataType: 'STRING' },
];

validate('price * quantity + tax', fields);
// ✓ valid, resultType: 'NUMBER'

validate('(price * quantity) * (1 + tax / 100)', fields);
// ✓ valid, resultType: 'NUMBER'

validate('ROUND(price * quantity, 2)', fields);
// ✓ valid, resultType: 'NUMBER'

validate('price + label', fields);
// ✗ Cannot add NUMBER and STRING

validate('price * unknown', fields);
// ✗ Field "unknown" not found in the dataset
```

### Report engine: date/time calculations

Type inference tracks result types through complex temporal expressions:

```typescript
const validate = createValidator(sqlPreset);

const fields = [
  { name: 'start',       dataType: 'DATETIME' },
  { name: 'end',         dataType: 'DATETIME' },
  { name: 'shift_start', dataType: 'TIME' },
  { name: 'shift_end',   dataType: 'TIME' },
  { name: 'break_mins',  dataType: 'DURATION' },
  { name: 'headcount',   dataType: 'NUMBER' },
];

validate('@end - @start', fields);
// ✓ resultType: 'DURATION'  — how long something took

validate('@shift_end - @shift_start', fields);
// ✓ resultType: 'DURATION'  — shift length

validate('(@shift_end - @shift_start) - @break_mins', fields);
// ✓ resultType: 'DURATION'  — net work time (DURATION - DURATION)

validate('(@shift_end - @shift_start) / @headcount', fields);
// ✗ Cannot divide DURATION and NUMBER
//   (DURATION / NUMBER is allowed, but here it's the other way around —
//    the matrix is directional)

validate('@break_mins * @headcount', fields);
// ✓ resultType: 'DURATION'  — total break time across team

validate('@break_mins / @break_mins', fields);
// ✓ resultType: 'NUMBER'  — ratio of two durations
```

### Showing errors to users

Every error includes a machine-readable `rule`, a human-readable `message`, and a character `position`:

```typescript
const result = validate('SUM(@revenue) / @cost + SUUM(@tax)', [
  { name: 'revenue', dataType: 'NUMBER' },
  { name: 'cost',    dataType: 'NUMBER' },
  { name: 'tax',     dataType: 'NUMBER' },
]);

if (!result.valid) {
  // Show the first error to the user
  const err = result.errors[0];
  console.log(err.message);   // 'Unknown function "SUUM"'
  console.log(err.level);     // 'syntax'
  console.log(err.rule);      // 'function_name'
  console.log(err.position);  // 26 — character index in the formula

  // Highlight the error in a Monaco editor
  editor.setModelMarkers(model, 'formula', [{
    startColumn: err.position! + 1,
    endColumn: err.position! + 5,
    message: err.message,
    severity: monaco.MarkerSeverity.Error,
  }]);
}
```

## SQL Preset

The built-in `sqlPreset` provides a complete configuration modeled after standard SQL type semantics:

### 7 Data Types

`NUMBER` `STRING` `DATE` `TIME` `DATETIME` `DURATION` `BOOLEAN`

### 8 Functions

| Function | Aggregate | Accepts | Returns |
|----------|-----------|---------|---------|
| `SUM` | Yes | NUMBER, DURATION | same as input |
| `AVG` | Yes | NUMBER, DURATION | same as input |
| `MIN` | Yes | NUMBER, DATE, TIME, DATETIME, DURATION | same as input |
| `MAX` | Yes | NUMBER, DATE, TIME, DATETIME, DURATION | same as input |
| `COUNT` | Yes | any type | NUMBER |
| `AVERAGE` | Yes | NUMBER, DURATION | same as input |
| `ROUND` | No | NUMBER, DURATION (+ optional precision) | same as input |
| `CONCAT` | No | any type (variadic) | STRING |

### Arithmetic Type Matrix (excerpt)

| Left | Right | + | - | * | / |
|------|-------|---|---|---|---|
| NUMBER | NUMBER | NUMBER | NUMBER | NUMBER | NUMBER |
| DATE | DATE | - | DURATION | - | - |
| DATE | DURATION | DATE | DATETIME | - | - |
| DURATION | DURATION | DURATION | DURATION | - | NUMBER |
| DURATION | NUMBER | - | - | DURATION | DURATION |
| NUMBER | DURATION | - | - | DURATION | - |
| TIME | TIME | - | DURATION | - | - |
| DATETIME | DATETIME | - | DURATION | - | - |
| STRING | * | - | - | - | - |
| BOOLEAN | * | - | - | - | - |

`-` = operation not allowed (returns a validation error).

Full matrix covers all 49 type pair combinations across 4 operators.

## Validation Rules

### Syntax Checks

| Rule | Example | Error |
|------|---------|-------|
| Balanced parentheses | `SUM(@value` | Unclosed parenthesis |
| Valid operators | `@a */ @b` | Unexpected token |
| Function whitelist | `SUUM(@value)` | Unknown function "SUUM" |
| Function arity | `ROUND(@v, 2, 1)` | ROUND expects 1 or 2 argument(s) |
| Valid tokens | `@a + #b` | Invalid character "#" |

### Semantic Checks

| Rule | Example | Error |
|------|---------|-------|
| Field existence | `@value / @missing` | Field "missing" not found |
| Operation types | `@country + 1` | Cannot add STRING and NUMBER |
| Function arg types | `SUM(@country)` | SUM is not applicable to STRING |
| Aggregate conflict | `SUM(@a) / @b` | Missing aggregate function for "b" |
| Nested aggregates | `SUM(AVG(@a))` | Nested aggregates are not supported |

## Field Formats

Three ways to reference fields in formulas:

### `'prefix'` (default) — `@fieldName`

```typescript
const validate = createValidator(sqlPreset);
// or: createValidator({ ...sqlPreset, fieldFormat: 'prefix', fieldPrefix: '@' })

validate('SUM(@revenue) / COUNT(@country)', fields);
```

### `'quoted'` — `"fieldName"`

Fields are quoted strings. Functions use standard call syntax. Ideal for BI tools and dashboard builders.

```typescript
const validate = createValidator({ ...sqlPreset, fieldFormat: 'quoted' });

validate('sum("revenue") / count("country")', fields);
validate('(sum("revenue") + sum("tax")) / count("country")', fields);
validate('"start_date" - "end_date"', fields);  // → DURATION
```

### `'none'` — `fieldName`

Bare identifiers that don't match a function name are treated as fields. Feels like a spreadsheet.

```typescript
const validate = createValidator({ ...sqlPreset, fieldFormat: 'none' });

validate('SUM(revenue) / COUNT(country)', fields);
validate('price * quantity + tax', fields);
```

## Custom Configuration

Define your own type system:

```typescript
import { createValidator, ValidatorConfig } from 'formula-type-validator';

const config: ValidatorConfig = {
  // Custom field prefix (default: '@')
  fieldPrefix: '$',

  // Define available functions
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
      resultTypeMap: { STRING: 'NUMBER' },  // LEN("hello") = 5
    },
    {
      name: 'CONCAT',
      arity: [1, Infinity],       // variadic
      allowedArgTypes: ['*'],     // accepts any type
      isAggregate: false,
      resultTypeMap: { '*': 'STRING' },  // always returns STRING
    },
  ],

  // Define which operations are allowed between which types
  operationRules: [
    { left: 'NUMBER', right: 'NUMBER', operator: '+', resultType: 'NUMBER' },
    { left: 'NUMBER', right: 'NUMBER', operator: '-', resultType: 'NUMBER' },
    { left: 'NUMBER', right: 'NUMBER', operator: '*', resultType: 'NUMBER' },
    { left: 'NUMBER', right: 'NUMBER', operator: '/', resultType: 'NUMBER' },
    // STRING + STRING not listed = not allowed
  ],
};

const validate = createValidator(config);

validate('$price * $quantity', [
  { name: 'price', dataType: 'NUMBER' },
  { name: 'quantity', dataType: 'NUMBER' },
]);
// { valid: true, resultType: 'NUMBER' }
```

## API Reference

### `createValidator(config: ValidatorConfig)`

Creates a validator function bound to the given configuration.

**Returns:** `(formula: string, fields: FieldMeta[]) => ValidationResult`

### `ValidatorConfig`

```typescript
interface ValidatorConfig {
  functions: FunctionDef[];        // Available functions
  operationRules: OperationRule[]; // Allowed type combinations for +, -, *, /
  fieldFormat?: FieldFormat;       // 'prefix' | 'quoted' | 'none' (default: 'prefix')
  fieldPrefix?: string;            // Prefix character when fieldFormat is 'prefix' (default: '@')
}
```

### `FunctionDef`

```typescript
interface FunctionDef {
  name: string;                    // Function name (case-insensitive matching)
  arity: [number, number];         // [min, max] argument count (use Infinity for variadic)
  allowedArgTypes: string[];       // Accepted input types ('*' = any)
  isAggregate: boolean;            // Whether this is an aggregate function
  resultTypeMap: Record<string, string>; // Input type -> result type ('*' = catch-all)
}
```

### `FieldMeta`

```typescript
interface FieldMeta {
  name: string;      // Field name (matched against @name in formulas)
  dataType: string;  // Data type (must match types used in config)
}
```

### `ValidationResult`

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  resultType?: string;  // Inferred result type (when valid)
  ast?: ASTNode;        // Parsed AST (when parsing succeeds)
}
```

### `ValidationError`

```typescript
interface ValidationError {
  level: 'syntax' | 'semantic';
  rule: string;       // Machine-readable rule ID
  message: string;    // Human-readable error message
  position?: number;  // Character position in the formula
}
```

### Low-level exports

The tokenizer, parser, and AST types are also exported for advanced use cases:

```typescript
import { tokenize, Parser, NodeKind } from 'formula-type-validator';

// Tokenize a formula
const { tokens, errors } = tokenize('SUM(@revenue) + 1', '@');

// Parse tokens into AST
const parser = new Parser(tokens, myFunctions);
const ast = parser.parse();

// Walk the AST
function walk(node) {
  switch (node.kind) {
    case NodeKind.Number:       // { value: number, pos: number }
    case NodeKind.Field:        // { name: string, pos: number }
    case NodeKind.BinaryOp:     // { op, left, right, pos }
    case NodeKind.FunctionCall:  // { name, args, pos }
  }
}
```

## Formula Syntax

```
expression = term (('+' | '-') term)*
term       = unary (('*' | '/') unary)*
unary      = '-' unary | '+' unary | factor
factor     = function_call | field | number | '(' expression ')'

function_call = IDENTIFIER '(' expression (',' expression)* ')'
field         = '@' IDENTIFIER
number        = DIGIT+ ('.' DIGIT+)?
```

**Supported constructs:**

- Field references: `@revenue`, `@total_count`
- Numbers: `42`, `3.14`, `100.5`
- Operators: `+`, `-`, `*`, `/`
- Parentheses: `(@a + @b) * @c`
- Unary minus: `-@value`, `@a * -2`
- Functions: `SUM(@revenue)`, `ROUND(@value, 2)`
- Nested expressions: `(SUM(@a) + SUM(@b)) / SUM(@c)`

## Project Structure

```
formula-type-validator/
├── src/
│   ├── types.ts              # TypeScript interfaces and AST node types
│   ├── tokenizer.ts          # Lexical analysis (string -> tokens)
│   ├── parser.ts             # Recursive descent parser (tokens -> AST)
│   ├── semanticValidator.ts  # Type inference and semantic checks
│   ├── presets.ts            # Built-in SQL preset configuration
│   ├── validator.ts          # Main createValidator facade
│   ├── index.ts              # Public API exports
│   └── __tests__/
│       ├── validator.test.ts     # 49 tests — syntax, semantics, type inference
│       ├── fieldFormats.test.ts  # 23 tests — quoted, none, prefix field formats
│       └── customConfig.test.ts  # 7 tests — custom configurations
├── dist/                     # Built output (CJS + ESM + .d.ts)
├── package.json
├── tsconfig.json
├── tsup.config.ts            # Build configuration
└── vitest.config.ts          # Test configuration
```

## Contributing

Contributions are welcome. To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Write tests for your changes
4. Ensure all tests pass (`npm test`)
5. Submit a Pull Request

## License

[MIT](LICENSE)
