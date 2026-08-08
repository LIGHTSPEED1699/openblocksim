import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlockLibrary } from '../../src/components/BlockLibrary';

describe('BlockLibrary', () => {
  it('renders all 6 category headers', () => {
    render(<BlockLibrary onDragStart={() => {}} />);
    expect(screen.getByText('Sources')).toBeInTheDocument();
    expect(screen.getByText('Sinks')).toBeInTheDocument();
    expect(screen.getByText('Math')).toBeInTheDocument();
    expect(screen.getByText('Linear')).toBeInTheDocument();
    expect(screen.getByText('Nonlinear')).toBeInTheDocument();
    expect(screen.getByText('Control')).toBeInTheDocument();
  });

  it('renders Constant block under Sources', () => {
    render(<BlockLibrary onDragStart={() => {}} />);
    expect(screen.getByText('Constant')).toBeInTheDocument();
  });

  it('renders PID under Control', () => {
    render(<BlockLibrary onDragStart={() => {}} />);
    expect(screen.getByText('PID')).toBeInTheDocument();
  });
});