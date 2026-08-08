import { BaseNode } from './BaseNode';
import type { NodeProps } from '@xyflow/react';

export function ControlNode(props: NodeProps) {
  return <BaseNode {...props} data={{ ...props.data, color: 'border-block-control' }} />;
}