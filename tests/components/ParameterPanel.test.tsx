import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ParameterPanel } from '../../src/components/ParameterPanel';
import { BlockType } from '../../src/blocks/types';

describe('ParameterPanel', () => {
  it('shows "No block selected" when none selected', () => {
    render(<ParameterPanel selectedBlockId={null} blockType={null} params={{}} onUpdate={() => {}} />);
    expect(screen.getByText(/No block selected/i)).toBeInTheDocument();
  });

  it('renders parameter inputs for a Gain block', () => {
    render(
      <ParameterPanel
        selectedBlockId="g1"
        blockType={BlockType.Gain}
        params={{ gain: 5 }}
        onUpdate={() => {}}
      />
    );
    expect(screen.getByRole('heading', { name: 'Gain' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
  });

  it('calls onUpdate when parameter changes', () => {
    const onUpdate = vi.fn();
    render(
      <ParameterPanel
        selectedBlockId="g1"
        blockType={BlockType.Gain}
        params={{ gain: 5 }}
        onUpdate={onUpdate}
      />
    );
    const input = screen.getByDisplayValue('5');
    fireEvent.change(input, { target: { value: '10' } });
    expect(onUpdate).toHaveBeenCalledWith('g1', { gain: 10 });
  });

  it('stores a "="-prefixed expression string verbatim', () => {
    const onUpdate = vi.fn();
    render(
      <ParameterPanel
        selectedBlockId="g1"
        blockType={BlockType.Gain}
        params={{ gain: 5 }}
        onUpdate={onUpdate}
      />
    );
    const input = screen.getByDisplayValue('5');
    fireEvent.change(input, { target: { value: '=base*2' } });
    expect(onUpdate).toHaveBeenCalledWith('g1', { gain: '=base*2' });
  });

  it('displays an existing expression value in the field', () => {
    render(
      <ParameterPanel
        selectedBlockId="g1"
        blockType={BlockType.Gain}
        params={{ gain: '=2*3' }}
        onUpdate={() => {}}
      />
    );
    expect(screen.getByDisplayValue('=2*3')).toBeInTheDocument();
  });

  it('ignores an empty edit (keeps the previous value)', () => {
    const onUpdate = vi.fn();
    render(
      <ParameterPanel
        selectedBlockId="g1"
        blockType={BlockType.Gain}
        params={{ gain: 5 }}
        onUpdate={onUpdate}
      />
    );
    fireEvent.change(screen.getByDisplayValue('5'), { target: { value: '' } });
    expect(onUpdate).not.toHaveBeenCalled();
  });
});