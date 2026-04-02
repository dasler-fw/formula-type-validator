import {
  ASTNode,
  NodeKind,
  FieldMeta,
  FunctionCallNode,
  ValidationError,
  FunctionDef,
  OperationRule,
} from './types';
import { Messages, en as defaultMessages } from './messages';

interface TypeCheckContext {
  fields: Map<string, FieldMeta>;
  funcMap: Map<string, FunctionDef>;
  opRules: Map<string, string>;
  errors: ValidationError[];
  msg: Messages;
}

const makeOpKey = (left: string, right: string, op: string): string =>
  `${left}:${op}:${right}`;

export const createTypeChecker = (
  functions: FunctionDef[],
  operationRules: OperationRule[],
  messages: Messages = defaultMessages,
) => {
  const funcMap = new Map(functions.map(f => [f.name.toUpperCase(), f]));
  const opRules = new Map(
    operationRules.map(r => [makeOpKey(r.left, r.right, r.operator), r.resultType]),
  );

  const inferType = (node: ASTNode, ctx: TypeCheckContext): string | null => {
    switch (node.kind) {
      case NodeKind.Number:
        return 'NUMBER';

      case NodeKind.Field: {
        const field = ctx.fields.get(node.name);
        if (!field) {
          ctx.errors.push({
            level: 'semantic',
            rule: 'field_exists',
            message: ctx.msg.fieldNotFound(node.name),
            position: node.pos,
          });
          return null;
        }
        return field.dataType;
      }

      case NodeKind.FunctionCall:
        return inferFunctionType(node, ctx);

      case NodeKind.BinaryOp: {
        const leftType = inferType(node.left, ctx);
        const rightType = inferType(node.right, ctx);
        if (!leftType || !rightType) return null;

        const key = makeOpKey(leftType, rightType, node.op);
        const resultType = ctx.opRules.get(key) ?? null;

        if (!resultType) {
          ctx.errors.push({
            level: 'semantic',
            rule: 'type_mismatch',
            message: ctx.msg.typeMismatch(ctx.msg.opName(node.op), leftType, rightType),
            position: node.pos,
          });
          return null;
        }
        return resultType;
      }
    }
  };

  const inferFunctionType = (
    node: FunctionCallNode,
    ctx: TypeCheckContext,
  ): string | null => {
    const def = ctx.funcMap.get(node.name);
    if (!def) return null;

    // Nested aggregates check: SUM(AVG(@value))
    if (def.isAggregate && node.args.length > 0) {
      const arg = node.args[0];
      if (
        arg.kind === NodeKind.FunctionCall &&
        ctx.funcMap.get(arg.name)?.isAggregate
      ) {
        ctx.errors.push({
          level: 'semantic',
          rule: 'nested_aggregates',
          message: ctx.msg.nestedAggregates(),
          position: node.pos,
        });
        return null;
      }
    }

    const argTypes = node.args.map(arg => inferType(arg, ctx));
    const inputType = argTypes[0];
    if (!inputType) return null;

    // Check if function accepts this type
    if (!def.allowedArgTypes.includes(inputType) && !def.allowedArgTypes.includes('*')) {
      ctx.errors.push({
        level: 'semantic',
        rule: 'function_arg_type',
        message: ctx.msg.functionArgType(def.name, inputType),
        position: node.pos,
      });
      return null;
    }

    // For functions with a fixed secondary numeric argument (like ROUND),
    // validate that the second argument is a number.
    // Skip for variadic functions (like CONCAT) where arity max is Infinity.
    if (!def.isAggregate && def.arity[1] > 1 && def.arity[1] !== Infinity && argTypes.length > 1) {
      if (argTypes[1] !== null && argTypes[1] !== 'NUMBER') {
        ctx.errors.push({
          level: 'semantic',
          rule: 'function_arg_type',
          message: ctx.msg.secondArgMustBeNumber(def.name),
          position: node.pos,
        });
      }
    }

    return def.resultTypeMap['*'] ?? def.resultTypeMap[inputType] ?? null;
  };

  /** Collect all fields NOT wrapped in an aggregate function */
  const collectBareFields = (node: ASTNode): string[] => {
    switch (node.kind) {
      case NodeKind.Field:
        return [node.name];
      case NodeKind.Number:
        return [];
      case NodeKind.FunctionCall:
        if (funcMap.get(node.name)?.isAggregate) return [];
        return node.args.flatMap(collectBareFields);
      case NodeKind.BinaryOp:
        return [...collectBareFields(node.left), ...collectBareFields(node.right)];
    }
  };

  /** Check if AST contains at least one aggregate function call */
  const hasAggregates = (node: ASTNode): boolean => {
    switch (node.kind) {
      case NodeKind.Field:
      case NodeKind.Number:
        return false;
      case NodeKind.FunctionCall:
        if (funcMap.get(node.name)?.isAggregate) return true;
        return node.args.some(hasAggregates);
      case NodeKind.BinaryOp:
        return hasAggregates(node.left) || hasAggregates(node.right);
    }
  };

  return (
    ast: ASTNode,
    availableFields: FieldMeta[],
  ): { errors: ValidationError[]; resultType: string | null } => {
    const ctx: TypeCheckContext = {
      fields: new Map(availableFields.map(f => [f.name, f])),
      funcMap,
      opRules,
      errors: [],
      msg: messages,
    };

    const resultType = inferType(ast, ctx);

    // Aggregate/non-aggregate conflict check
    if (hasAggregates(ast)) {
      const bareFields = collectBareFields(ast);
      const seen = new Set<string>();
      for (const fieldName of bareFields) {
        if (ctx.fields.has(fieldName) && !seen.has(fieldName)) {
          seen.add(fieldName);
          ctx.errors.push({
            level: 'semantic',
            rule: 'aggregate_conflict',
            message: ctx.msg.aggregateConflict(fieldName),
          });
        }
      }
    }

    return { errors: ctx.errors, resultType };
  };
};
