import { BaseNode } from './BaseNode';
import type { NodeProps } from '@xyflow/react';

export function DiscreteNode(props: NodeProps) {
  return <BaseNode {...props} data={{ ...props.data, color: 'bg-cyan-500' }} />;
}