export class AnimationController {
  constructor(totalSteps = 0, onStepChange, onPlayStateChange) {
    this.totalSteps = totalSteps;
    this.currentStep = 0;
    this.isPlaying = false;
    this.playDelay = 2500;
    this.playTimer = null;
    this.onStepChange = onStepChange;
    this.onPlayStateChange = onPlayStateChange;
  }

  setTotalSteps(totalSteps) {
    this.totalSteps = totalSteps;
    if (this.currentStep >= totalSteps) {
      this.currentStep = Math.max(0, totalSteps - 1);
    }
  }

  next() {
    if (this.currentStep < this.totalSteps - 1) {
      this.currentStep++;
      this.notifyStepChange();
    }
  }

  previous() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.notifyStepChange();
    }
  }

  seek(index) {
    if (index >= 0 && index < this.totalSteps) {
      this.currentStep = index;
      this.notifyStepChange();
    }
  }

  play(delay = 2500) {
    this.playDelay = delay;
    this.isPlaying = true;
    this.notifyPlayStateChange();
    this.scheduleNextStep();
  }

  pause() {
    this.isPlaying = false;
    this.cancelTimer();
    this.notifyPlayStateChange();
  }

  getCurrentStep() {
    return this.currentStep;
  }

  isPlaying() {
    return this.isPlaying;
  }

  getTotalSteps() {
    return this.totalSteps;
  }

  scheduleNextStep() {
    this.cancelTimer();
    this.playTimer = setTimeout(() => {
      if (this.currentStep < this.totalSteps - 1) {
        this.currentStep++;
        this.notifyStepChange();
        this.scheduleNextStep();
      } else {
        this.isPlaying = false;
        this.notifyPlayStateChange();
      }
    }, this.playDelay);
  }

  cancelTimer() {
    if (this.playTimer) {
      clearTimeout(this.playTimer);
      this.playTimer = null;
    }
  }

  notifyStepChange() {
    if (this.onStepChange) {
      this.onStepChange(this.currentStep);
    }
  }

  notifyPlayStateChange() {
    if (this.onPlayStateChange) {
      this.onPlayStateChange(this.isPlaying);
    }
  }
}