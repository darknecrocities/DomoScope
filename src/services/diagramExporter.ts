import { Node, Edge } from '@xyflow/react';
import { ArchitectureNodeData, ArchitectureEdgeData } from '../types';

export function exportToMermaid(
  nodes: Node<ArchitectureNodeData>[],
  edges: Edge<ArchitectureEdgeData>[]
): string {
  let mermaid = 'graph TD\n';

  // Define nodes
  for (const n of nodes) {
    const cleanId = n.id.replace(/[^a-zA-Z0-9_]/g, '_');
    const label = n.data.label;
    const cat = n.data.category;
    mermaid += `    ${cleanId}["${label} (${cat})"]\n`;
  }

  mermaid += '\n';

  // Define edges
  for (const e of edges) {
    const sourceClean = e.source.replace(/[^a-zA-Z0-9_]/g, '_');
    const targetClean = e.target.replace(/[^a-zA-Z0-9_]/g, '_');
    if (e.data?.type === 'inferred') {
      mermaid += `    ${sourceClean} -.-> ${targetClean}\n`;
    } else {
      mermaid += `    ${sourceClean} --> ${targetClean}\n`;
    }
  }

  return mermaid;
}

export function exportToPlantUML(
  nodes: Node<ArchitectureNodeData>[],
  edges: Edge<ArchitectureEdgeData>[]
): string {
  let puml = '@startuml\n';
  puml += 'skinparam componentStyle uml2\n\n';

  for (const n of nodes) {
    const cleanId = n.id.replace(/[^a-zA-Z0-9_]/g, '_');
    puml += `component [${n.data.label}] as ${cleanId}\n`;
  }

  puml += '\n';

  for (const e of edges) {
    const sourceClean = e.source.replace(/[^a-zA-Z0-9_]/g, '_');
    const targetClean = e.target.replace(/[^a-zA-Z0-9_]/g, '_');
    puml += `${sourceClean} --> ${targetClean}\n`;
  }

  puml += '@enduml\n';
  return puml;
}
