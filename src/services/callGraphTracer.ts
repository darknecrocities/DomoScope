import { CallGraphNode } from '../types';

export function buildCallGraph(fileContents: Map<string, string>, targetFunctionName?: string): CallGraphNode[] {
  const nodesMap = new Map<string, CallGraphNode>();
  const functionNames: string[] = [];

  // 1. Scan function declarations
  for (const [file, code] of fileContents.entries()) {
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match function declarations: function foo(), const bar = () =>, void baz(), def qux():
      const fnMatch = line.match(/(?:function|def|void|Future<[\w<>]+>|Widget)\s+([a-zA-Z0-9_]+)\s*\(/) ||
                      line.match(/(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>/);

      if (fnMatch) {
        const fnName = fnMatch[1];
        if (!['if', 'for', 'while', 'switch', 'catch', 'setState', 'build'].includes(fnName)) {
          const id = `fn-${fnName}-${file}`;
          nodesMap.set(id, {
            id,
            name: fnName,
            file,
            line: i + 1,
            calls: [],
            calledBy: [],
          });
          functionNames.push(fnName);
        }
      }
    }
  }

  // 2. Scan function calls within each function body
  const allNodes = Array.from(nodesMap.values());
  for (const node of allNodes) {
    const code = fileContents.get(node.file);
    if (!code) continue;

    for (const targetName of functionNames) {
      if (targetName !== node.name) {
        const callRegex = new RegExp(`\\b${targetName}\\s*\\(`, 'g');
        if (callRegex.test(code)) {
          node.calls.push(targetName);
          const targetNode = allNodes.find((n) => n.name === targetName);
          if (targetNode && !targetNode.calledBy.includes(node.name)) {
            targetNode.calledBy.push(node.name);
          }
        }
      }
    }
  }

  if (targetFunctionName) {
    return allNodes.filter((n) => n.name === targetFunctionName || n.calls.includes(targetFunctionName) || n.calledBy.includes(targetFunctionName));
  }

  return allNodes.slice(0, 20); // Top 20 call nodes for visual clarity
}
