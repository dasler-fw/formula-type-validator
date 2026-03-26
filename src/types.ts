// ---- Configuration types ----

/**
 * Definition of a function available in formulas.
 */
export interface FunctionDef {
  /** Function name (will be matched case-insensitively) */
  name: string;
  /** Allowed argument count: [min, max]. Use Infinity for variadic. */
  arity: [number, number];
  /** Data types allowed for the first argument */
  allowedArgTypes: string[];
  /** Whether this is an aggregate function (SUM, AVG, etc.) */
  isAggregate: boolean;
  /**
   * Maps input data type to result data type.
   * E.g. { NUMBER: 'NUMBER', DURATION: 'DURATION' } for SUM.
   * Use '*' key as a catch-all (e.g. CONCAT always returns STRING).
   */
  resultTypeMap: Record<string, string>;
}

/**
 * Rule for arithmetic operations between two types.
 */
export interface OperationRule {
  left: string;
  right: string;
  operator: '+' | '-' | '*' | '/';
  resultType: string;
}

/**
 * Metadata about a field available in the dataset.
 */
export interface FieldMeta {
  name: string;
  dataType: string;
}

/**
 * Configuration for the formula validator.
 */
export interface ValidatorConfig {
  /** Available functions (SUM, AVG, ROUND, etc.) */
  functions: FunctionDef[];
  /** Allowed arithmetic operation combinations and their result types */
  operationRules: OperationRule[];
  /** Character used to prefix field references. Default: '@' */
  fieldPrefix?: string;
}

// ---- Validation result types ----

export interface ValidationError {
  level: 'syntax' | 'semantic';
  rule: string;
  message: string;
  position?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  /** Inferred result type of the entire expression (when valid) */
  resultType?: string;
  /** AST of the parsed expression (when parsed successfully) */
  ast?: ASTNode;
}

// ---- AST node types ----

export enum NodeKind {
  Number = 'Number',
  Field = 'Field',
  BinaryOp = 'BinaryOp',
  FunctionCall = 'FunctionCall',
}

export interface NumberNode {
  kind: NodeKind.Number;
  value: number;
  pos: number;
}

export interface FieldNode {
  kind: NodeKind.Field;
  name: string;
  pos: number;
}

export interface BinaryOpNode {
  kind: NodeKind.BinaryOp;
  op: '+' | '-' | '*' | '/';
  left: ASTNode;
  right: ASTNode;
  pos: number;
}

export interface FunctionCallNode {
  kind: NodeKind.FunctionCall;
  name: string;
  args: ASTNode[];
  pos: number;
}

export type ASTNode = NumberNode | FieldNode | BinaryOpNode | FunctionCallNode;
