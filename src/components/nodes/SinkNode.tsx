import { BaseNode } from './BaseNode';
import type { NodeProps } from '@xyflow/react';

export function SinkNode(props: NodeProps) {
  return <BaseNode {...props} data={{ ...props.data, color: 'bg-blue-500' }} />;
}