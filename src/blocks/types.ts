export enum BlockType {
  Constant = 'Constant',
  Step = 'Step',
  Ramp = 'Ramp',
  Sine = 'Sine',
  Square = 'Square',
  Scope = 'Scope',
  ToWorkspace = 'ToWorkspace',
  Sum = 'Sum',
  Gain = 'Gain',
  Product = 'Product',
  TransferFunction = 'TransferFunction',
  StateSpace = 'StateSpace',
  Integrator = 'Integrator',
  Derivative = 'Derivative',
  TransportDelay = 'TransportDelay',
  Saturation = 'Saturation',
  Deadzone = 'Deadzone',
  PID = 'PID',
  Relay = 'Relay',
}

export enum BlockCategory {
  Source = 'Source',
  Sink = 'Sink',
  Math = 'Math',
  Linear = 'Linear',
  Nonlinear = 'Nonlinear',
  Control = 'Control',
}

export type Params = Record<string, number | number[]>;
export type BlockState = number[];

export interface ParamSpec {
  [key: string]: {
    type: 'number' | 'array' | 'select';
    default: number | number[];
    min?: number;
    max?: number;
    step?: number;
    label: string;
    description?: string;
  };
}

export interface Block {
  type: BlockType;
  category: BlockCategory;
  inputs: number;
  outputs: number;
  isDynamic: boolean;
  stateSize: number;
  stateUpdateMode: 'derivative' | 'absolute';
  parameters: ParamSpec;
  compute(
    dt: number,
    inputs: number[],
    state: BlockState,
    params: Params,
    t?: number
  ): [number[], BlockState];
}

export interface BlockFactory {
  category: BlockCategory;
  create: (params?: Params) => Block;
}