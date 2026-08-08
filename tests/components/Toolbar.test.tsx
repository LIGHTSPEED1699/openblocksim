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