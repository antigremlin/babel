/* @flow */

import * as t from "babel-types";

const PRECEDENCE = {
  "||": 0,
  "&&": 1,
  "|": 2,
  "^": 3,
  "&": 4,
  "==": 5,
  "===": 5,
  "!=": 5,
  "!==": 5,
  "<": 6,
  ">": 6,
  "<=": 6,
  ">=": 6,
  in: 6,
  instanceof: 6,
  ">>": 7,
  "<<": 7,
  ">>>": 7,
  "+": 8,
  "-": 8,
  "*": 9,
  "/": 9,
  "%": 9,
  "**": 10
};

export function NullableTypeAnnotation(node: Object, parent: Object): boolean {
  return t.isArrayTypeAnnotation(parent);
}

export { NullableTypeAnnotation as FunctionTypeAnnotation };

export function UpdateExpression(node: Object, parent: Object): boolean {
  if (t.isMemberExpression(parent) && parent.object === node) {
    // (foo++).test()
    return true;
  }

  return false;
}

export function ObjectExpression(node: Object, parent: Object): boolean {
  if (t.isExpressionStatement(parent)) {
    // ({ foo: "bar" });
    return true;
  }

  if (t.isMemberExpression(parent) && parent.object === node) {
    // ({ foo: "bar" }).foo
    return true;
  }

  if ((t.isBinaryExpression(parent) || t.isLogicalExpression(parent)) && parent.left === node) {
    // We'd need to check that the parent's parent is an ExpressionStatement. But this
    // code doesn't make any sense to begin with and should be rare.
    // `({}) === foo`
    return true;
  }

  return false;
}

export function Binary(node: Object, parent: Object): boolean {
  if ((t.isCallExpression(parent) || t.isNewExpression(parent)) && parent.callee === node) {
    return true;
  }

  if (t.isUnaryLike(parent)) {
    return true;
  }

  if (t.isMemberExpression(parent) && parent.object === node) {
    return true;
  }

  if (t.isBinary(parent)) {
    let parentOp  = parent.operator;
    let parentPos = PRECEDENCE[parentOp];

    let nodeOp = node.operator;
    let nodePos = PRECEDENCE[nodeOp];

    if (parentPos > nodePos) {
      return true;
    }

    // Logical expressions with the same precedence don't need parens.
    if (parentPos === nodePos && parent.right === node && !t.isLogicalExpression(parent)) {
      return true;
    }
  }

  return false;
}

export function BinaryExpression(node: Object, parent: Object): boolean {
  if (node.operator === "in") {
    // let i = (1 in []);
    if (t.isVariableDeclarator(parent)) {
      return true;
    }

    // for ((1 in []);;);
    if (t.isFor(parent)) {
      return true;
    }
  }

  return false;
}

export function SequenceExpression(node: Object, parent: Object): boolean {
  if (t.isForStatement(parent)) {
    // Although parentheses wouldn"t hurt around sequence
    // expressions in the head of for loops, traditional style
    // dictates that e.g. i++, j++ should not be wrapped with
    // parentheses.
    return false;
  }

  if (t.isExpressionStatement(parent) && parent.expression === node) {
    return false;
  }

  if (t.isReturnStatement(parent)) {
    return false;
  }

  if (t.isThrowStatement(parent)) {
    return false;
  }

  // Otherwise err on the side of overparenthesization, adding
  // explicit exceptions above if this proves overzealous.
  return true;
}

export function YieldExpression(node: Object, parent: Object): boolean {
  return t.isBinary(parent) ||
         t.isUnaryLike(parent) ||
         t.isCallExpression(parent) ||
         t.isMemberExpression(parent) ||
         t.isNewExpression(parent) ||
         t.isConditionalExpression(parent) ||
         t.isYieldExpression(parent);
}

export function ClassExpression(node: Object, parent: Object): boolean {
  // (class {});
  if (t.isExpressionStatement(parent)) {
    return true;
  }

  // export default (class () {});
  if (t.isExportDeclaration(parent)) {
    return true;
  }

  return false;
}

export function UnaryLike(node: Object, parent: Object): boolean {
  if (t.isMemberExpression(parent, { object: node })) {
    return true;
  }

  if (t.isCallExpression(parent, { callee: node }) || t.isNewExpression(parent, { callee: node })) {
    return true;
  }

  return false;
}

export function FunctionExpression(node: Object, parent: Object): boolean {
  // (function () {});
  if (t.isExpressionStatement(parent)) {
    return true;
  }

  // export default (function () {});
  if (t.isExportDeclaration(parent)) {
    return true;
  }

  return UnaryLike(node, parent);
}

export function ArrowFunctionExpression(node: Object, parent: Object): boolean {
  // export default (function () {});
  if (t.isExportDeclaration(parent)) {
    return true;
  }

  if (t.isBinaryExpression(parent) || t.isLogicalExpression(parent)) {
    return true;
  }

  return UnaryLike(node, parent);
}

export function ConditionalExpression(node: Object, parent: Object): boolean {
  if (t.isUnaryLike(parent)) {
    return true;
  }

  if (t.isBinary(parent)) {
    return true;
  }

  if (t.isConditionalExpression(parent, { test: node })) {
    return true;
  }

  return UnaryLike(node, parent);
}

export function AssignmentExpression(node: Object): boolean {
  if (t.isObjectPattern(node.left)) {
    return true;
  } else {
    return ConditionalExpression(...arguments);
  }
}
