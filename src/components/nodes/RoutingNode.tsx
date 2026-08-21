import { BaseNode } from './BaseNode';
import type { NodeProps } from '@xyflow/react';

export function RoutingNode(props: NodeProps) {
  return <BaseNode {...props} data={{ ...props.data, color: 'bg-cyan-500' }} />;
}