import type { TreeNode } from './Parser';

export type EvalStep = {
  tree: TreeNode;
  evaluatedNodeId: string;
  resultValue: string;
};

// Deep copy of the tree to avoid mutating the original during steps
function cloneTree(node: TreeNode): TreeNode {
  return {
    ...node,
    left: node.left ? cloneTree(node.left) : undefined,
    right: node.right ? cloneTree(node.right) : undefined,
  };
}

export class Evaluator {
  private steps: EvalStep[] = [];

  public evaluate(root: TreeNode | null): { result: number; steps: EvalStep[] } {
    this.steps = [];
    if (!root) return { result: 0, steps: [] };
    
    // We work on a cloned tree so we can mutate and record states
    const workingTree = cloneTree(root);
    const finalResult = this.evaluateNode(workingTree, workingTree);
    
    return { result: finalResult, steps: this.steps };
  }

  private evaluateNode(node: TreeNode, fullTree: TreeNode): number {
    if (node.type === 'number') {
      return parseFloat(node.value);
    }

    if (!node.left || !node.right) {
      return 0; // Invalid tree
    }

    const leftVal = this.evaluateNode(node.left, fullTree);
    const rightVal = this.evaluateNode(node.right, fullTree);

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
        result = leftVal / rightVal;
        break;
    }

    // Mutate the working node to become a number node (simplification)
    const oldId = node.id;
    node.type = 'number';
    node.value = result.toString();
    node.left = undefined;
    node.right = undefined;
    node.isEvaluated = true; // Mark to highlight in UI

    // Record the step
    this.steps.push({
      tree: cloneTree(fullTree),
      evaluatedNodeId: oldId,
      resultValue: result.toString(),
    });

    return result;
  }
}
