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
  Comment = 'Comment',
  Abs = 'Abs',
  Sign = 'Sign',
  Bias = 'Bias',
  UnaryMinus = 'UnaryMinus',
  Divide = 'Divide',
  MinMax = 'MinMax',
  RoundingFunction = 'RoundingFunction',
  MathFunction = 'MathFunction',
  TrigFunction = 'TrigFunction',
  Interpolate = 'Interpolate',
  Pow = 'Pow',
  Clip = 'Clip',
  Mux = 'Mux',
  Demux = 'Demux',
  Switch = 'Switch',
  UnitDelay = 'UnitDelay',
  DiscreteIntegrator = 'DiscreteIntegrator',
  DiscreteTransferFcn = 'DiscreteTransferFcn',
  Memory = 'Memory',
  RateLimiter = 'RateLimiter',
  Quantizer = 'Quantizer',
  Backlash = 'Backlash',
  PulseGenerator = 'PulseGenerator',
  Clock = 'Clock',
  ChirpSignal = 'ChirpSignal',
  RepeatingSequence = 'RepeatingSequence',
  RandomNumber = 'RandomNumber',
  Terminator = 'Terminator',
  Display = 'Display',
  StopSimulation = 'StopSimulation',
  Inport = 'Inport',
  Outport = 'Outport',
  Subsystem = 'Subsystem',
}

export enum BlockCategory {
  Source = 'Source',
  Sink = 'Sink',
  Math = 'Math',
  Linear = 'Linear',
  Nonlinear = 'Nonlinear',
  Control = 'Control',
  Routing = 'Routing',
  Annotation = 'Annotation',
  Discrete = 'Discrete',
  Port = 'Port',
  Hierarchy = 'Hierarchy',
}

export type Params = Record<string, number | number[] | string>;
export type BlockState = number[];

export interface ParamSpec {
  [key: string]: {
    type: 'number' | 'array' | 'select' | 'text';
    default: number | number[] | string;
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
  outputSize?: number;
  isDynamic: boolean;
  stateSize: number;
  stateUpdateMode: 'derivative' | 'absolute';
  parameters: ParamSpec;
  crossingSign?: (inputs: number[], params: Params) => (t: number, state: number[]) => number;
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

export interface BlockMetaEntry {
  type: BlockType;
  category: string;
  math?: string;
  doc?: string;
  portLabels?: string[];
  paramSpec?: ParamSpec;
  eventG?: (t: number, state: number[], params: Params) => number[];
}