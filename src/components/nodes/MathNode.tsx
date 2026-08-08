import { BaseNode } from './BaseNode';
import type { NodeProps } from '@xyflow/react';

export function MathNode(props: NodeProps) {
  return <BaseNode {...props} data={{ ...props.data, color: 'border-block-math' }} />;
}