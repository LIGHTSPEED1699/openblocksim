import { describe, it, expect } from 'vitest';
import { mapBlockType, mapParams, parseMDL, parseSLXXml, importSimulinkModel } from '../../src/utils/simulinkImport';
import { BlockType } from '../../src/blocks/types';

describe('Block type mapper', () => {
  it('maps Constant', () => {
    expect(mapBlockType('Constant')).toBe(BlockType.Constant);
  });
  it('maps Step', () => {
    expect(mapBlockType('Step')).toBe(BlockType.Step);
  });
  it('maps Sine Wave', () => {
    expect(mapBlockType('SineWave')).toBe(BlockType.Sine);
  });
  it('maps Transfer Fcn', () => {
    expect(mapBlockType('TransferFcn')).toBe(BlockType.TransferFunction);
  });
  it('maps Gain', () => {
    expect(mapBlockType('Gain')).toBe(BlockType.Gain);
  });
  it('maps Sum', () => {
    expect(mapBlockType('Sum')).toBe(BlockType.Sum);
  });
  it('maps Integrator', () => {
    expect(mapBlockType('Integrator')).toBe(BlockType.Integrator);
  });
  it('maps Saturation', () => {
    expect(mapBlockType('Saturation')).toBe(BlockType.Saturation);
  });
  it('maps Transport Delay', () => {
    expect(mapBlockType('TransportDelay')).toBe(BlockType.TransportDelay);
  });
  it('maps PID Controller', () => {
    expect(mapBlockType('PIDController')).toBe(BlockType.PID);
  });
  it('maps Relay', () => {
    expect(mapBlockType('Relay')).toBe(BlockType.Relay);
  });
  it('maps Scope', () => {
    expect(mapBlockType('Scope')).toBe(BlockType.Scope);
  });
  it('maps unknown block to Comment', () => {
    expect(mapBlockType('SomeRandomBlock')).toBe(BlockType.Comment);
  });
});

describe('Parameter mapper', () => {
  it('maps Step params: time + amplitude', () => {
    const params = mapParams('Step', { time: '2', amplitude: '5' });
    expect(params.stepTime).toBe(2);
    expect(params.stepValue).toBe(5);
  });
  it('maps Gain param', () => {
    const params = mapParams('Gain', { gain: '3.5' });
    expect(params.gain).toBe(3.5);
  });
  it('maps Sum signs from string', () => {
    const params = mapParams('Sum', { inputs: '+-' });
    expect(params.signs).toEqual([1, -1]);
  });
  it('maps TransferFcn numerator and denominator', () => {
    const params = mapParams('TransferFcn', { numerator: '[1]', denominator: '[1 2 1]' });
    expect(params.num).toEqual([1]);
    expect(params.den).toEqual([1, 2, 1]);
  });
  it('maps SineWave frequency from rad/s to Hz', () => {
    const params = mapParams('SineWave', { amplitude: '2', frequency: '6.2832', phase: '0' });
    expect(params.amplitude).toBe(2);
    expect(params.frequency).toBeCloseTo(1, 3); // 2*pi / 2*pi ≈ 1 Hz
  });
  it('maps Saturation upper and lower', () => {
    const params = mapParams('Saturation', { upper: '10', lower: '-5' });
    expect(params.upperLimit).toBe(10);
    expect(params.lowerLimit).toBe(-5);
  });
  it('maps Integrator initial condition', () => {
    const params = mapParams('Integrator', { initialCondition: '3' });
    expect(params.initialValue).toBe(3);
  });
  it('maps unknown block params to text', () => {
    const params = mapParams('UnknownBlock', { foo: 'bar' });
    expect(params.text).toContain('UnknownBlock');
  });
});

describe('MDL parser', () => {
  it('parses simple MDL with blocks and lines', () => {
    const mdlText = `Model {
  Name "test"
  System {
    Block {
      BlockType Step
      Name "Step1"
      Position [50, 50, 80, 70]
      time "1"
      amplitude "5"
    }
    Block {
      BlockType Gain
      Name "Gain1"
      Position [150, 50, 200, 70]
      gain "2"
    }
    Line {
      SrcBlock "Step1"
      SrcPort 1
      DstBlock "Gain1"
      DstPort 1
    }
  }
}`;
    const result = parseMDL(mdlText);
    expect(result.blocks.length).toBe(2);
    expect(result.blocks[0].simType).toBe('Step');
    expect(result.blocks[1].simType).toBe('Gain');
    expect(result.lines.length).toBe(1);
    expect(result.lines[0].srcBlock).toBe('Step1');
    expect(result.lines[0].dstBlock).toBe('Gain1');
  });
});

describe('SLX XML parser', () => {
  it('parses blockdiagram XML', () => {
    const xml = `<?xml version="1.0"?>
    <System>
      <Block BlockType="Step" Name="Step1" SID="1">
        <P Name="Position">[50, 50, 80, 70]</P>
        <P Name="time">1</P>
        <P Name="amplitude">5</P>
      </Block>
      <Block BlockType="Gain" Name="Gain1" SID="2">
        <P Name="Position">[150, 50, 200, 70]</P>
        <P Name="gain">2</P>
      </Block>
      <Line>
        <P Name="Src">1#out:1</P>
        <P Name="Dst">2#in:1</P>
      </Line>
    </System>`;
    const result = parseSLXXml(xml);
    expect(result.blocks.length).toBe(2);
    expect(result.blocks[0].simType).toBe('Step');
    expect(result.blocks[1].simType).toBe('Gain');
    expect(result.lines.length).toBe(1);
    expect(result.lines[0].srcSid).toBe('1');
    expect(result.lines[0].dstSid).toBe('2');
  });
});

describe('Full import pipeline', () => {
  it('imports MDL text and returns summary with supported blocks', () => {
    const mdlText = `Model {
  Name "test"
  System {
    Block {
      BlockType Step
      Name "Step1"
      Position [50, 50, 80, 70]
      time "0"
      amplitude "1"
    }
    Block {
      BlockType TransferFcn
      Name "Plant"
      Position [150, 50, 250, 70]
      numerator "[1]"
      denominator "[1 1]"
    }
    Block {
      BlockType Scope
      Name "Scope1"
      Position [300, 50, 330, 70]
    }
    Line {
      SrcBlock "Step1"
      SrcPort 1
      DstBlock "Plant"
      DstPort 1
    }
    Line {
      SrcBlock "Plant"
      SrcPort 1
      DstBlock "Scope1"
      DstPort 1
    }
  }
}`;
    const result = importSimulinkModel(mdlText, 'mdl');
    expect(result.summary.supportedBlocks).toBe(3);
    expect(result.summary.unsupportedBlocks).toBe(0);
    expect(result.model.blocks.length).toBe(3);
    expect(result.model.edges.length).toBe(2);
  });

  it('reports unsupported blocks in summary', () => {
    const mdlText = `Model {
  Name "test"
  System {
    Block {
      BlockType Step
      Name "Step1"
      Position [50, 50, 80, 70]
      time "0"
      amplitude "1"
    }
    Block {
      BlockType LookupTable1D
      Name "LUT1"
      Position [150, 50, 200, 70]
    }
    Block {
      BlockType Scope
      Name "Scope1"
      Position [300, 50, 330, 70]
    }
    Line {
      SrcBlock "Step1"
      SrcPort 1
      DstBlock "LUT1"
      DstPort 1
    }
    Line {
      SrcBlock "LUT1"
      SrcPort 1
      DstBlock "Scope1"
      DstPort 1
    }
  }
}`;
    const result = importSimulinkModel(mdlText, 'mdl');
    expect(result.summary.supportedBlocks).toBe(2);
    expect(result.summary.unsupportedBlocks).toBe(1);
    expect(result.summary.unsupportedTypes).toContain('LookupTable1D');
    // Unsupported block should still appear as a Comment block
    const commentBlock = result.model.blocks.find((b) => b.type === 'Comment');
    expect(commentBlock).toBeDefined();
  });
});