import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlotArea } from '../../src/components/PlotArea';
import { useDiagramStore } from '../../src/store/diagramStore';
import React from 'react';

vi.mock('react-plotly.js', () => ({
  default: function Plot() {
    return React.createElement('div', { className: 'js-plotly-plot' },
      React.createElement('svg', { className: 'main-svg' })
    );
  },
}));

describe('PlotArea', () => {
  beforeEach(() => {
    useDiagramStore.getState().clear();
  });

  it('shows error message when simError is set', () => {
    useDiagramStore.getState().setSimError('Simulation failed: division by zero');
    render(React.createElement(PlotArea));
    expect(screen.getByText('Simulation failed: division by zero')).toBeTruthy();
  });

  it('shows empty prompt when no simResults and no error', () => {
    useDiagramStore.getState().setSimResults(null);
    useDiagramStore.getState().setSimError(null);
    render(React.createElement(PlotArea));
    expect(screen.getByText('Run a simulation to see plots')).toBeTruthy();
  });

  it('shows "No Scope blocks" when simResults exist but no Scope nodes', () => {
    useDiagramStore.getState().setSimResults({
      time: [0, 0.1, 0.2],
      scopes: {},
    });
    render(React.createElement(PlotArea));
    expect(screen.getByText('No Scope blocks in diagram')).toBeTruthy();
  });

  it('renders plot when simResults and Scope nodes exist', () => {
    useDiagramStore.getState().addNode(
      {
        id: 'Scope-1',
        type: 'Sink',
        position: { x: 0, y: 0 },
        data: { type: 'Scope', inputs: 1, outputs: 0, color: '' },
      },
      'Scope' as any,
      {},
    );
    useDiagramStore.getState().setSimResults({
      time: [0, 0.1, 0.2],
      scopes: { 'Scope-1': [0, 1, 2] },
    });

    render(React.createElement(PlotArea));
    const svg = document.querySelector('.main-svg');
    expect(svg).toBeTruthy();
  });

  it('renders one plot per Scope node', () => {
    useDiagramStore.getState().addNode(
      { id: 'Scope-1', type: 'Sink', position: { x: 0, y: 0 }, data: { type: 'Scope', inputs: 1, outputs: 0, color: '' } },
      'Scope' as any, {},
    );
    useDiagramStore.getState().addNode(
      { id: 'Scope-2', type: 'Sink', position: { x: 100, y: 0 }, data: { type: 'Scope', inputs: 1, outputs: 0, color: '' } },
      'Scope' as any, {},
    );
    useDiagramStore.getState().setSimResults({
      time: [0, 0.1],
      scopes: { 'Scope-1': [0, 1], 'Scope-2': [2, 3] },
    });

    render(React.createElement(PlotArea));
    const plots = document.querySelectorAll('.js-plotly-plot');
    expect(plots.length).toBe(2);
  });

  it('uses empty array for Scope node with no trace data', () => {
    useDiagramStore.getState().addNode(
      { id: 'Scope-1', type: 'Sink', position: { x: 0, y: 0 }, data: { type: 'Scope', inputs: 1, outputs: 0, color: '' } },
      'Scope' as any, {},
    );
    useDiagramStore.getState().setSimResults({
      time: [0, 0.1],
      scopes: { 'Scope-2': [0, 1] },
    });

    render(React.createElement(PlotArea));
    const svg = document.querySelector('.main-svg');
    expect(svg).toBeTruthy();
  });
});
