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
    const pidElements = screen.getAllByText('PID');
    expect(pidElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows every block type across all 9 category headers', () => {
    render(<BlockLibrary onDragStart={() => {}} />);
    for (const label of ['Sources', 'Sinks', 'Math', 'Linear', 'Discrete', 'Nonlinear', 'Control', 'Routing', 'Annotation']) {
      expect(screen.getByRole('heading', { name: label })).toBeInTheDocument();
    }
    // Regression: Pow and Clip were dropped from the hardcoded Math group.
    expect(screen.getByText('Pow')).toBeInTheDocument();
    expect(screen.getByText('Clip')).toBeInTheDocument();
  });

  it('shows the BlockMeta doc as a tooltip on chips', () => {
    render(<BlockLibrary onDragStart={() => {}} />);
    expect(screen.getByTitle('Multiply input by gain')).toBeInTheDocument(); // Gain doc, meta.ts:30
    expect(screen.getByTitle('Constant value source')).toBeInTheDocument();  // Constant doc, meta.ts:10
  });
});