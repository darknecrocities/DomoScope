import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ErrorBoundary } from '../src/components/common/ErrorBoundary';
import { isIframeOrAnna } from '../src/App';

function CrashingComponent(): React.ReactElement {
  throw new Error('Simulated AST / Monaco parse failure');
}

function SafeComponent(): React.ReactElement {
  return <div data-testid="safe-child">DomoScope Safe Visualizer Child</div>;
}

describe('ErrorBoundary & Iframe Routing Resilience', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('renders children normally when no exception occurs', () => {
    const html = renderToString(
      <ErrorBoundary fallbackTitle="Test Error">
        <SafeComponent />
      </ErrorBoundary>
    );

    expect(html).toContain('DomoScope Safe Visualizer Child');
    expect(html).not.toContain('Test Error');
  });

  it('catches render errors and produces recovery UI with title and try again button', () => {
    const boundary = new ErrorBoundary({
      children: <SafeComponent />,
      fallbackTitle: 'Architecture Graph Error',
      fallbackMessage: 'Custom error message for AST failure',
    });

    // Simulate getDerivedStateFromError
    const derivedState = ErrorBoundary.getDerivedStateFromError(new Error('Simulated syntax crash'));
    expect(derivedState.hasError).toBe(true);
    expect(derivedState.error?.message).toBe('Simulated syntax crash');

    // Simulate componentDidCatch
    boundary.state = {
      hasError: true,
      error: new Error('Simulated syntax crash'),
      errorInfo: { componentStack: '\n    in CrashingComponent' },
      isDetailsOpen: false,
    };
    boundary.componentDidCatch(new Error('Simulated syntax crash'), {
      componentStack: '\n    in CrashingComponent',
    });

    expect(console.error).toHaveBeenCalled();

    // Render in error state
    const rendered = boundary.render();
    const html = renderToString(rendered as React.ReactElement);

    expect(html).toContain('Architecture Graph Error');
    expect(html).toContain('Custom error message for AST failure');
    expect(html).toContain('Try Again');
    expect(html).toContain('Back to Overview');
    expect(html).toContain('Diagnostic Trace');
  });

  it('resets error state when handleReset is invoked', () => {
    const onReset = vi.fn();
    const boundary = new ErrorBoundary({
      children: <SafeComponent />,
      onReset,
    });

    boundary.state = {
      hasError: true,
      error: new Error('AST Error'),
      errorInfo: null,
      isDetailsOpen: true,
    };

    let setStateCalledWith: any = null;
    boundary.setState = vi.fn().mockImplementation((updater) => {
      setStateCalledWith = typeof updater === 'function' ? updater(boundary.state) : updater;
    });

    boundary.handleReset();

    expect(boundary.setState).toHaveBeenCalled();
    expect(setStateCalledWith).toEqual({
      hasError: false,
      error: null,
      errorInfo: null,
      isDetailsOpen: false,
    });
    expect(onReset).toHaveBeenCalled();
  });

  it('toggles diagnostic details state on toggleDetails', () => {
    const boundary = new ErrorBoundary({
      children: <SafeComponent />,
    });

    boundary.state = {
      hasError: true,
      error: new Error('AST crash'),
      errorInfo: null,
      isDetailsOpen: false,
    };

    boundary.setState = vi.fn().mockImplementation((updater) => {
      boundary.state = { ...boundary.state, ...updater(boundary.state) };
    });

    boundary.toggleDetails();
    expect(boundary.state.isDetailsOpen).toBe(true);

    boundary.toggleDetails();
    expect(boundary.state.isDetailsOpen).toBe(false);
  });

  it('supports custom function fallback', () => {
    const boundary = new ErrorBoundary({
      children: <SafeComponent />,
      fallback: (error, reset) => (
        <div data-testid="custom-fallback">
          <span>Custom Handler: {error.message}</span>
          <button onClick={reset}>Reset</button>
        </div>
      ),
    });

    boundary.state = {
      hasError: true,
      error: new Error('Graph cycle detected'),
      errorInfo: null,
      isDetailsOpen: false,
    };

    const rendered = boundary.render();
    const html = renderToString(rendered as React.ReactElement);

    expect(html).toContain('Custom Handler:');
    expect(html).toContain('Graph cycle detected');
    expect(html).toContain('Reset');
  });

  it('validates isIframeOrAnna logic', () => {
    expect(typeof isIframeOrAnna).toBe('boolean');
  });
});
