export class ProgressTracker {
  private totalSteps: number;
  private completedSteps: number;
  private onUpdate: (percentage: number) => void;

  constructor(totalSteps: number, onUpdate: (p: number) => void) {
    this.totalSteps = totalSteps;
    this.completedSteps = 0;
    this.onUpdate = onUpdate;
  }

  increment() {
    this.completedSteps++;
    const percentage = Math.min(100, Math.round((this.completedSteps / this.totalSteps) * 100));
    this.onUpdate(percentage);
  }

  reset() {
    this.completedSteps = 0;
    this.onUpdate(0);
  }

  setTotalSteps(total: number) {
    this.totalSteps = total;
    this.reset();
  }
}

export function createProgressTracker(totalSteps: number, onUpdate: (percentage: number) => void): ProgressTracker {
  return new ProgressTracker(totalSteps, onUpdate);
}