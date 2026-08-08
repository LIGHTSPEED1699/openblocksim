import { BaseNode } from './BaseNode';
import type { NodeProps } from '@xyflow/react';

export function NonlinearNode(props: NodeProps) {
  return <BaseNode {...props} data={{ ...props.data, color: 'border-block-nonlinear' }} />;
}