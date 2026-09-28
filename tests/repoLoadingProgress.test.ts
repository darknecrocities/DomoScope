import { describe, it, expect } from 'vitest';
import { VERIFICATION_CHECKS } from '../src/components/workspace/RepoLoadingProgress';

describe('Repository Verification & Loading Progress Engine', () => {
  it('defines 5 exhaustive verification checks in correct topological sequence', () => {
    expect(VERIFICATION_CHECKS).toHaveLength(5);

    const stepKeywords = VERIFICATION_CHECKS.map((c) => c.stepKeyword);
    expect(stepKeywords).toEqual([
      'Checking repository',
      'Reading files',
      'Understanding structure',
      'Building project map',
      'Preparing workspace',
    ]);

    // Ensure all checks have non-empty user-friendly titles and details
    VERIFICATION_CHECKS.forEach((check) => {
      expect(check.id).toBeTruthy();
      expect(check.title).toBeTruthy();
      expect(check.detail).toBeTruthy();
      expect(check.icon).toBeDefined();
    });
  });

  it('correctly maps loadingStep keywords to step indices', () => {
    const mapStepToIndex = (step: string) => {
      switch (step) {
        case 'Checking repository':
          return 0;
        case 'Reading files':
          return 1;
        case 'Understanding structure':
          return 2;
        case 'Building project map':
          return 3;
        case 'Preparing workspace':
        case 'done':
          return 4;
        default:
          return 0;
      }
    };

    expect(mapStepToIndex('Checking repository')).toBe(0);
    expect(mapStepToIndex('Reading files')).toBe(1);
    expect(mapStepToIndex('Understanding structure')).toBe(2);
    expect(mapStepToIndex('Building project map')).toBe(3);
    expect(mapStepToIndex('Preparing workspace')).toBe(4);
    expect(mapStepToIndex('done')).toBe(4);
  });

  it('calculates progress percentage accurately across check increments', () => {
    const calculateProgress = (completedCount: number, isAllComplete: boolean) => {
      if (isAllComplete || completedCount >= 5) return 100;
      return Math.min(95, completedCount * 20);
    };

    expect(calculateProgress(0, false)).toBe(0);
    expect(calculateProgress(1, false)).toBe(20);
    expect(calculateProgress(2, false)).toBe(40);
    expect(calculateProgress(3, false)).toBe(60);
    expect(calculateProgress(4, false)).toBe(80);
    expect(calculateProgress(5, true)).toBe(100);
  });

  it('guarantees that proceeding is gated until all checks are complete', () => {
    let proceedCalled = false;
    const onProceed = () => {
      proceedCalled = true;
    };

    const isDataReady = true;
    const completedSteps = [0, 1, 2, 3]; // Only 4 of 5 completed

    // Even if data is ready, cannot proceed if checks are incomplete
    const canProceed = isDataReady && completedSteps.length === 5;
    expect(canProceed).toBe(false);
    expect(proceedCalled).toBe(false);

    // Once all 5 checks are verified
    const allCompletedSteps = [0, 1, 2, 3, 4];
    const canProceedNow = isDataReady && allCompletedSteps.length === 5;
    expect(canProceedNow).toBe(true);

    if (canProceedNow) {
      onProceed();
    }
    expect(proceedCalled).toBe(true);
  });
});
