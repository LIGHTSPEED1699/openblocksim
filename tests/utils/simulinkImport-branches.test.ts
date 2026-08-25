import { describe, it, expect } from 'vitest';
import { parseSLXXml } from '../../src/utils/simulinkImport';

describe('SLX Branch parsing (fan-out connections)', () => {
  it('parses Branch Dst elements (fan-out from one source)', () => {
    // Simulink uses Branch elements inside Line for fan-out:
    // one source → multiple destinations.
    const xml = `<?xml version="1.0"?>
    <System>
      <Block BlockType="Constant" Name="Src1" SID="1">
        <P Name="Position">[10, 10, 30, 30]</P>
      </Block>
      <Block BlockType="Gain" Name="Dest1" SID="2">
        <P Name="Position">[100, 10, 120, 30]</P>
      </Block>
      <Block BlockType="Scope" Name="Dest2" SID="3">
        <P Name="Position">[100, 50, 120, 70]</P>
      </Block>
      <Line>
        <P Name="Src">1#out:1</P>
        <Branch>
          <P Name="Dst">2#in:1</P>
        </Branch>
        <Branch>
          <P Name="Dst">3#in:1</P>
        </Branch>
      </Line>
    </System>`;
    const result = parseSLXXml(xml);
    expect(result.blocks.length).toBe(3);
    expect(result.lines.length).toBe(2);
    // Both lines should have the same source (SID 1, port 0)
    expect(result.lines[0].srcSid).toBe('1');
    expect(result.lines[0].srcPort).toBe(0);
    expect(result.lines[0].dstSid).toBe('2');
    expect(result.lines[0].dstPort).toBe(0);
    expect(result.lines[1].srcSid).toBe('1');
    expect(result.lines[1].srcPort).toBe(0);
    expect(result.lines[1].dstSid).toBe('3');
    expect(result.lines[1].dstPort).toBe(0);
  });

  it('parses nested Branch elements (multi-level fan-out)', () => {
    const xml = `<?xml version="1.0"?>
    <System>
      <Block BlockType="Constant" Name="Src1" SID="1">
        <P Name="Position">[10, 10, 30, 30]</P>
      </Block>
      <Block BlockType="Gain" Name="Dest1" SID="2">
        <P Name="Position">[100, 10, 120, 30]</P>
      </Block>
      <Block BlockType="Scope" Name="Dest2" SID="3">
        <P Name="Position">[100, 50, 120, 70]</P>
      </Block>
      <Block BlockType="Scope" Name="Dest3" SID="4">
        <P Name="Position">[100, 90, 120, 110]</P>
      </Block>
      <Line>
        <P Name="Src">1#out:1</P>
        <Branch>
          <P Name="Dst">2#in:1</P>
          <Branch>
            <P Name="Dst">3#in:1</P>
          </Branch>
          <Branch>
            <P Name="Dst">4#in:1</P>
          </Branch>
        </Branch>
      </Line>
    </System>`;
    const result = parseSLXXml(xml);
    expect(result.lines.length).toBe(3);
    // All should share the same source
    expect(result.lines.every((l) => l.srcSid === '1')).toBe(true);
    // Destinations should be 2, 3, 4
    const dsts = result.lines.map((l) => l.dstSid).sort();
    expect(dsts).toEqual(['2', '3', '4']);
  });

  it('parses both direct Dst and Branch Dst on the same Line', () => {
    const xml = `<?xml version="1.0"?>
    <System>
      <Block BlockType="Constant" Name="Src1" SID="1">
        <P Name="Position">[10, 10, 30, 30]</P>
      </Block>
      <Block BlockType="Gain" Name="Dest1" SID="2">
        <P Name="Position">[100, 10, 120, 30]</P>
      </Block>
      <Block BlockType="Scope" Name="Dest2" SID="3">
        <P Name="Position">[100, 50, 120, 70]</P>
      </Block>
      <Line>
        <P Name="Src">1#out:1</P>
        <P Name="Dst">2#in:1</P>
        <Branch>
          <P Name="Dst">3#in:1</P>
        </Branch>
      </Line>
    </System>`;
    const result = parseSLXXml(xml);
    expect(result.lines.length).toBe(2);
    // Direct Dst
    expect(result.lines[0].dstSid).toBe('2');
    // Branch Dst
    expect(result.lines[1].dstSid).toBe('3');
  });

  it('parses lconn/rconn port format (Simscape physical connections)', () => {
    const xml = `<?xml version="1.0"?>
    <System>
      <Block BlockType="Constant" Name="Src1" SID="1">
        <P Name="Position">[10, 10, 30, 30]</P>
      </Block>
      <Block BlockType="Gain" Name="Dest1" SID="2">
        <P Name="Position">[100, 10, 120, 30]</P>
      </Block>
      <Line>
        <P Name="Src">1#lconn:1</P>
        <P Name="Dst">2#rconn:1</P>
      </Line>
    </System>`;
    const result = parseSLXXml(xml);
    expect(result.lines.length).toBe(1);
    expect(result.lines[0].srcSid).toBe('1');
    expect(result.lines[0].srcPort).toBe(0);
    expect(result.lines[0].dstSid).toBe('2');
    expect(result.lines[0].dstPort).toBe(0);
  });

  it('parses Branch with its own Src (Simscape connection branches)', () => {
    const xml = `<?xml version="1.0"?>
    <System>
      <Block BlockType="Constant" Name="Src1" SID="1">
        <P Name="Position">[10, 10, 30, 30]</P>
      </Block>
      <Block BlockType="Gain" Name="Dest1" SID="2">
        <P Name="Position">[100, 10, 120, 30]</P>
      </Block>
      <Block BlockType="Gain" Name="Src2" SID="3">
        <P Name="Position">[10, 50, 30, 70]</P>
      </Block>
      <Line>
        <P Name="Src">1#out:1</P>
        <P Name="Dst">2#in:1</P>
        <Branch>
          <P Name="Src">3#lconn:1</P>
          <P Name="Dst">2#in:2</P>
        </Branch>
      </Line>
    </System>`;
    const result = parseSLXXml(xml);
    expect(result.lines.length).toBe(2);
    // Direct line: Src1 → Dest1
    expect(result.lines[0].srcSid).toBe('1');
    expect(result.lines[0].dstSid).toBe('2');
    expect(result.lines[0].dstPort).toBe(0);
    // Branch line: Src2 → Dest1 (branch has its own Src)
    expect(result.lines[1].srcSid).toBe('3');
    expect(result.lines[1].dstSid).toBe('2');
    expect(result.lines[1].dstPort).toBe(1);
  });
});