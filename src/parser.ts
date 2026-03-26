import { Token, TokenType } from './tokenizer';
import {
  ASTNode,
  NodeKind,
  FunctionCallNode,
  ValidationError,
  FunctionDef,
} from './types';

/**
 * Recursive descent parser.
 *
 * Grammar:
 *   expr     = term (('+' | '-') term)*
 *   term     = unary (('*' | '/') unary)*
 *   unary    = '-' unary | factor
 *   factor   = funcCall | field | number | '(' expr ')'
 *   funcCall = IDENT '(' args ')'
 *   args     = expr (',' expr)*
 */
export class Parser {
  private pos = 0;
  private tokens: Token[];
  private funcMap: Map<string, FunctionDef>;
  errors: ValidationError[] = [];

  constructor(tokens: Token[], functions: FunctionDef[]) {
    this.tokens = tokens;
    this.funcMap = new Map(functions.map(f => [f.name.toUpperCase(), f]));
  }

  parse(): ASTNode | null {
    if (this.tokens.length === 0) return null;
    const node = this.parseExpr();
    if (this.pos < this.tokens.length) {
      const t = this.tokens[this.pos];
      this.errors.push({
        level: 'syntax',
        rule: 'unexpected_token',
        message: `Unexpected token "${t.value}"`,
        position: t.pos,
      });
    }
    return node;
  }

  private peek(): Token | null {
    return this.pos < this.tokens.length ? this.tokens[this.pos] : null;
  }

  private consume(type?: TokenType): Token {
    const t = this.tokens[this.pos++];
    if (type && t?.type !== type) {
      this.errors.push({
        level: 'syntax',
        rule: 'expected_token',
        message: `Expected ${type}, got "${t?.value ?? 'end of expression'}"`,
        position: t?.pos ?? -1,
      });
    }
    return t;
  }

  private parseExpr(): ASTNode {
    let left = this.parseTerm();
    while (
      this.peek()?.type === TokenType.Operator &&
      (this.peek()!.value === '+' || this.peek()!.value === '-')
    ) {
      const opToken = this.consume();
      const right = this.parseTerm();
      left = {
        kind: NodeKind.BinaryOp,
        op: opToken.value as '+' | '-',
        left,
        right,
        pos: opToken.pos,
      };
    }
    return left;
  }

  private parseTerm(): ASTNode {
    let left = this.parseUnary();
    while (
      this.peek()?.type === TokenType.Operator &&
      (this.peek()!.value === '*' || this.peek()!.value === '/')
    ) {
      const opToken = this.consume();
      const right = this.parseUnary();
      left = {
        kind: NodeKind.BinaryOp,
        op: opToken.value as '*' | '/',
        left,
        right,
        pos: opToken.pos,
      };
    }
    return left;
  }

  private parseUnary(): ASTNode {
    const t = this.peek();

    // Unary minus: -expr becomes (0 - expr)
    if (t?.type === TokenType.Operator && t.value === '-') {
      const opToken = this.consume();
      const operand = this.parseUnary();
      return {
        kind: NodeKind.BinaryOp,
        op: '-',
        left: { kind: NodeKind.Number, value: 0, pos: opToken.pos },
        right: operand,
        pos: opToken.pos,
      };
    }

    // Unary plus: just skip it
    if (t?.type === TokenType.Operator && t.value === '+') {
      this.consume();
      return this.parseUnary();
    }

    return this.parseFactor();
  }

  private parseFactor(): ASTNode {
    const t = this.peek();
    if (!t) {
      this.errors.push({
        level: 'syntax',
        rule: 'unexpected_end',
        message: 'Unexpected end of expression',
      });
      return { kind: NodeKind.Number, value: 0, pos: -1 };
    }

    // Function call: IDENT(...)
    if (
      t.type === TokenType.Ident &&
      this.tokens[this.pos + 1]?.type === TokenType.LParen
    ) {
      return this.parseFunctionCall();
    }

    // Bare identifier (not followed by parenthesis)
    if (t.type === TokenType.Ident) {
      const name = t.value.toUpperCase();
      if (this.funcMap.has(name)) {
        this.errors.push({
          level: 'syntax',
          rule: 'function_no_parens',
          message: `Function "${t.value}" must be called with parentheses: ${t.value}(...)`,
          position: t.pos,
        });
      } else {
        this.errors.push({
          level: 'syntax',
          rule: 'unknown_identifier',
          message: `Unknown identifier "${t.value}". Fields must start with the field prefix`,
          position: t.pos,
        });
      }
      this.consume();
      return { kind: NodeKind.Number, value: 0, pos: t.pos };
    }

    // Field: @name
    if (t.type === TokenType.Field) {
      this.consume();
      return { kind: NodeKind.Field, name: t.value, pos: t.pos };
    }

    // Number
    if (t.type === TokenType.Number) {
      this.consume();
      return { kind: NodeKind.Number, value: parseFloat(t.value), pos: t.pos };
    }

    // Parenthesized expression: (expr)
    if (t.type === TokenType.LParen) {
      this.consume();
      const expr = this.parseExpr();
      if (this.peek()?.type === TokenType.RParen) {
        this.consume();
      } else {
        this.errors.push({
          level: 'syntax',
          rule: 'brackets',
          message: 'Unclosed parenthesis',
          position: t.pos,
        });
      }
      return expr;
    }

    this.errors.push({
      level: 'syntax',
      rule: 'unexpected_token',
      message: `Unexpected token "${t.value}"`,
      position: t.pos,
    });
    this.consume();
    return { kind: NodeKind.Number, value: 0, pos: t.pos };
  }

  private parseFunctionCall(): FunctionCallNode {
    const nameToken = this.consume();
    const funcName = nameToken.value.toUpperCase();
    this.consume(TokenType.LParen);

    const args: ASTNode[] = [];
    if (this.peek()?.type !== TokenType.RParen) {
      args.push(this.parseExpr());
      while (this.peek()?.type === TokenType.Comma) {
        this.consume();
        args.push(this.parseExpr());
      }
    }

    const funcDef = this.funcMap.get(funcName);
    if (!funcDef) {
      this.errors.push({
        level: 'syntax',
        rule: 'function_name',
        message: `Unknown function "${nameToken.value}"`,
        position: nameToken.pos,
      });
    } else {
      const [minArity, maxArity] = funcDef.arity;
      if (args.length < minArity || args.length > maxArity) {
        const expected =
          minArity === maxArity
            ? `${minArity}`
            : maxArity === Infinity
              ? `at least ${minArity}`
              : `${minArity} or ${maxArity}`;
        this.errors.push({
          level: 'syntax',
          rule: 'function_arity',
          message: `Function ${funcName} expects ${expected} argument(s), got ${args.length}`,
          position: nameToken.pos,
        });
      }
    }

    if (this.peek()?.type === TokenType.RParen) {
      this.consume();
    } else {
      this.errors.push({
        level: 'syntax',
        rule: 'brackets',
        message: `Unclosed parenthesis after ${funcName}(`,
        position: nameToken.pos,
      });
    }

    return {
      kind: NodeKind.FunctionCall,
      name: funcName,
      args,
      pos: nameToken.pos,
    };
  }
}
