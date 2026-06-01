export type NodeType = 'number' | 'operator';

export interface TreeNode {
  id: string;
  type: NodeType;
  value: string;
  left?: TreeNode;
  right?: TreeNode;
  isEvaluated?: boolean;
}

class Token {
  type: 'NUMBER' | 'OPERATOR' | 'LPAREN' | 'RPAREN';
  value: string;
  constructor(type: 'NUMBER' | 'OPERATOR' | 'LPAREN' | 'RPAREN', value: string) {
    this.type = type;
    this.value = value;
  }
}

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  
  // Clean string
  expression = expression.replace(/\s+/g, '');
  // Fix common OCR mistakes
  expression = expression.replace(/x/gi, '*');
  expression = expression.replace(/÷/g, '/');

  while (i < expression.length) {
    const char = expression[i];

    if (/[0-9.]/.test(char)) {
      let numStr = char;
      i++;
      while (i < expression.length && /[0-9.]/.test(expression[i])) {
        numStr += expression[i];
        i++;
      }
      tokens.push(new Token('NUMBER', numStr));
      continue;
    }

    if (['+', '-', '*', '/'].includes(char)) {
      tokens.push(new Token('OPERATOR', char));
      i++;
      continue;
    }

    if (char === '(') {
      tokens.push(new Token('LPAREN', char));
      i++;
      continue;
    }

    if (char === ')') {
      tokens.push(new Token('RPAREN', char));
      i++;
      continue;
    }

    // Ignore unknown characters
    i++;
  }

  return tokens;
}

let idCounter = 0;
function generateId(): string {
  return `node_${idCounter++}`;
}

export function parseExpression(expression: string): TreeNode | null {
  idCounter = 0; // reset for each parsing
  const tokens = tokenize(expression);
  if (tokens.length === 0) return null;

  let current = 0;

  function peek(): Token | null {
    return current < tokens.length ? tokens[current] : null;
  }

  function consume(): Token {
    return tokens[current++];
  }

  // Recursive descent parser
  function parseAddition(): TreeNode {
    let node = parseMultiplication();
    
    while (peek()?.value === '+' || peek()?.value === '-') {
      const token = consume();
      const right = parseMultiplication();
      node = {
        id: generateId(),
        type: 'operator',
        value: token.value,
        left: node,
        right: right,
      };
    }
    return node;
  }

  function parseMultiplication(): TreeNode {
    let node = parsePrimary();
    
    while (peek()?.value === '*' || peek()?.value === '/') {
      const token = consume();
      const right = parsePrimary();
      node = {
        id: generateId(),
        type: 'operator',
        value: token.value,
        left: node,
        right: right,
      };
    }
    return node;
  }

  function parsePrimary(): TreeNode {
    const token = peek();
    
    if (!token) {
      throw new Error("Unexpected end of expression");
    }

    if (token.type === 'NUMBER') {
      consume();
      return {
        id: generateId(),
        type: 'number',
        value: token.value,
      };
    }

    if (token.type === 'LPAREN') {
      consume();
      const node = parseAddition();
      const nextToken = consume();
      if (nextToken.type !== 'RPAREN') {
         throw new Error("Expected ')'");
      }
      return node;
    }

    // Unary minus support
    if (token.value === '-') {
        consume();
        const node = parsePrimary();
        return {
            id: generateId(),
            type: 'operator',
            value: '*',
            left: { id: generateId(), type: 'number', value: '-1' },
            right: node
        }
    }

    throw new Error(`Unexpected token: ${token.value}`);
  }

  try {
    return parseAddition();
  } catch (e) {
    console.error("Parser Error:", e);
    return null;
  }
}
