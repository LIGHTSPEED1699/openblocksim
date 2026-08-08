import { BaseNode } from './BaseNode';
import type { NodeProps } from '@xyflow/react';

export function SourceNode(props: NodeProps) {
  return <BaseNode {...props} data={{ ...props.data, color: 'bg-green-500' }} />;
}