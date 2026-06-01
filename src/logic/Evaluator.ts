import type { TreeNode } from './Parser';

export type EvalStep = {
  nodeId: string;        // The operator node being evaluated
  leftChildId: string;   // Left child that "flashes"
  rightChildId: string;  // Right child that "flashes"
  operator: string;      // The operator symbol
  leftValue: number;     // Left operand value
  rightValue: number;    // Right operand value
  resultValue: number;   // Result of the operation
};

// Deep copy of the tree
function cloneTree(node: TreeNode): TreeNode {
  return {
    ...node,
    left: node.left ? cloneTree(node.left) : undefined,
    right: node.right ? cloneTree(node.right) : undefined,
  };
}

// Find a node by ID and replace it in-place within a cloned tree
function replaceNode(tree: TreeNode, targetId: string, replacement: TreeNode): TreeNode {
  if (tree.id === targetId) {
    return { ...replacement };
  }
  return {
    ...tree,
    left: tree.left ? replaceNode(tree.left, targetId, replacement) : undefined,
    right: tree.right ? replaceNode(tree.right, targetId, replacement) : undefined,
  };
}

export class Evaluator {
  private steps: EvalStep[] = [];
  private snapshotTrees: TreeNode[] = [];
  private currentTree: TreeNode | null = null;

  public evaluate(root: TreeNode | null): { result: number; steps: EvalStep[]; snapshots: TreeNode[] } {
    this.steps = [];
    this.snapshotTrees = [];
    this.currentTree = null;
    
    if (!root) return { result: 0, steps: [], snapshots: [] };

    // Save the original tree as the first snapshot
    this.currentTree = cloneTree(root);
    this.snapshotTrees.push(cloneTree(this.currentTree));

    const finalResult = this.evaluateNode(root);

    return { result: finalResult, steps: this.steps, snapshots: this.snapshotTrees };
  }

  private evaluateNode(node: TreeNode): number {
    if (node.type === 'number') {
      return parseFloat(node.value);
    }

    if (!node.left || !node.right) {
      return 0;
    }

    // Evaluate left completely first, which will update this.currentTree
    const leftVal = this.evaluateNode(node.left);
    // Then evaluate right
    const rightVal = this.evaluateNode(node.right);

    let result = 0;
    switch (node.value) {
      case '+':
        result = leftVal + rightVal;
        break;
      case '-':
        result = leftVal - rightVal;
        break;
      case '*':
        result = leftVal * rightVal;
        break;
      case '/':
        result = rightVal !== 0 ? leftVal / rightVal : 0;
        break;
    }

    // Record step info
    this.steps.push({
      nodeId: node.id,
      leftChildId: node.left.id,
      rightChildId: node.right.id,
      operator: node.value,
      leftValue: leftVal,
      rightValue: rightVal,
      resultValue: result,
    });

    // Create the simplified replacement node
    const simplifiedNode: TreeNode = {
      id: node.id,
      type: 'number',
      value: formatNumber(result),
      isEvaluated: true,
    };

    // Replace the operator node in the working tree with the simplified result
    if (this.currentTree) {
      this.currentTree = replaceNode(this.currentTree, node.id, simplifiedNode);
      // Save a snapshot of the tree AFTER this simplification
      this.snapshotTrees.push(cloneTree(this.currentTree));
    }

    return result;
  }
}

function formatNumber(n: number): string {
  if (Number.isInteger(n)) return n.toString();
  // Show up to 4 decimals, remove trailing zeros
  return parseFloat(n.toFixed(4)).toString();
}
