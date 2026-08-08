import { BaseNode } from './BaseNode';
import type { NodeProps } from '@xyflow/react';

export function LinearNode(props: NodeProps) {
  return <BaseNode {...props} data={{ ...props.data, color: 'bg-purple-500' }} />;
}