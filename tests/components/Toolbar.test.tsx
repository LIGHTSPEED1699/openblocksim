import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toolbar } from '../../src/components/Toolbar';

describe('Toolbar', () => {
  it('renders Run and Reset buttons', () => {
    render(<Toolbar onRun={() => {}} onReset={() => {}} dt={0.01} duration={10} onDtChange={() => {}} onDurationChange={() => {}} theme="dark" onToggleTheme={() => {}} />);
    expect(screen.getByText('Run')).toBeInTheDocument();
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('calls onRun when Run button clicked', () => {
    const onRun = vi.fn();
    render(<Toolbar onRun={onRun} onReset={() => {}} dt={0.01} duration={10} onDtChange={() => {}} onDurationChange={() => {}} theme="dark" onToggleTheme={() => {}} />);
    fireEvent.click(screen.getByText('Run'));
    expect(onRun).toHaveBeenCalled();
  });

  it('shows dt and duration inputs', () => {
    render(<Toolbar onRun={() => {}} onReset={() => {}} dt={0.01} duration={10} onDtChange={() => {}} onDurationChange={() => {}} theme="dark" onToggleTheme={() => {}} />);
    expect(screen.getByDisplayValue('0.01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10')).toBeInTheDocument();
  });
});

describe('Toolbar undo/redo buttons', () => {
  it('renders Undo and Redo disabled when not available', () => {
    render(<Toolbar onRun={() => {}} onReset={() => {}} dt={0.01} duration={10} onDtChange={() => {}} onDurationChange={() => {}} theme="dark" onToggleTheme={() => {}} />);
    const undo = screen.getByRole('button', { name: 'Undo' });
    const redo = screen.getByRole('button', { name: 'Redo' });
    expect(undo).toBeDisabled();
    expect(redo).toBeDisabled();
  });

  it('enables Undo/Redo from canUndo/canRedo and fires the callbacks on click', () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    render(
      <Toolbar
        onRun={() => {}}
        onReset={() => {}}
        dt={0.01}
        duration={10}
        onDtChange={() => {}}
        onDurationChange={() => {}}
        theme="dark"
        onToggleTheme={() => {}}
        onUndo={onUndo}
        onRedo={onRedo}
        canUndo={true}
        canRedo={true}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);
  });

  it('disables Undo when canUndo is false even if the handler is passed', () => {
    render(
      <Toolbar
        onRun={() => {}}
        onReset={() => {}}
        dt={0.01}
        duration={10}
        onDtChange={() => {}}
        onDurationChange={() => {}}
        theme="dark"
        onToggleTheme={() => {}}
        onUndo={() => {}}
        canUndo={false}
        canRedo={true}
        onRedo={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeEnabled();
  });
});

describe('Toolbar Group Box button', () => {
  it('renders no Group Box button when onAddGroup is omitted', () => {
    render(<Toolbar onRun={() => {}} onReset={() => {}} dt={0.01} duration={10} onDtChange={() => {}} onDurationChange={() => {}} theme="dark" onToggleTheme={() => {}} />);
    expect(screen.queryByRole('button', { name: /group box/i })).toBeNull();
  });

  it('renders and fires the Group Box button when onAddGroup is provided', () => {
    const onAddGroup = vi.fn();
    render(<Toolbar onRun={() => {}} onReset={() => {}} dt={0.01} duration={10} onDtChange={() => {}} onDurationChange={() => {}} theme="dark" onToggleTheme={() => {}} onAddGroup={onAddGroup} />);
    fireEvent.click(screen.getByRole('button', { name: /group box/i }));
    expect(onAddGroup).toHaveBeenCalledTimes(1);
  });
});