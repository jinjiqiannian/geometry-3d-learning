const HIGHLIGHT_COLORS = {
  primary: '#4A90E2',
  secondary: '#50C878',
  warning: '#FFD700',
  error: '#FF6B6B',
  info: '#9370DB',
};

const ANIMATION_CONFIG = {
  fadeInDuration: 400,
  fadeOutDuration: 300,
  pulseDuration: 1500,
};

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t) {
  return Math.pow(t, 3);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export class HighlightEngine {
  constructor() {
    this.highlightedPoints = new Set();
    this.highlightedLines = new Set();
    this.highlightedPlanes = new Set();
    this.highlightedLabels = new Set();
    
    this.pointAnimations = new Map();
    this.lineAnimations = new Map();
    this.planeAnimations = new Map();
    this.labelAnimations = new Map();
    
    this.currentColor = HIGHLIGHT_COLORS.primary;
    this.lastUpdate = performance.now();
  }
  
  setColor(color) {
    this.currentColor = color;
  }
  
  getColor(key) {
    return this.currentColor;
  }
  
  highlightPoints(pointIds, options = {}) {
    pointIds.forEach(id => {
      this.highlightedPoints.add(id);
      if (!options.noAnimation) {
        this.pointAnimations.set(id, {
          type: 'fadeIn',
          startTime: performance.now(),
          duration: ANIMATION_CONFIG.fadeInDuration,
        });
      }
    });
  }
  
  highlightLines(lineIds, options = {}) {
    lineIds.forEach(id => {
      this.highlightedLines.add(id);
      if (!options.noAnimation) {
        this.lineAnimations.set(id, {
          type: 'fadeIn',
          startTime: performance.now(),
          duration: ANIMATION_CONFIG.fadeInDuration,
        });
      }
    });
  }
  
  highlightPlanes(planeIds, options = {}) {
    planeIds.forEach(id => {
      this.highlightedPlanes.add(id);
      if (!options.noAnimation) {
        this.planeAnimations.set(id, {
          type: 'fadeIn',
          startTime: performance.now(),
          duration: ANIMATION_CONFIG.fadeInDuration,
        });
      }
    });
  }
  
  highlightLabels(labelIds, options = {}) {
    labelIds.forEach(id => {
      this.highlightedLabels.add(id);
      if (!options.noAnimation) {
        this.labelAnimations.set(id, {
          type: 'fadeIn',
          startTime: performance.now(),
          duration: ANIMATION_CONFIG.fadeInDuration,
        });
      }
    });
  }
  
  unhighlightPoints(pointIds, options = {}) {
    pointIds.forEach(id => {
      if (!options.noAnimation && this.highlightedPoints.has(id)) {
        this.pointAnimations.set(id, {
          type: 'fadeOut',
          startTime: performance.now(),
          duration: ANIMATION_CONFIG.fadeOutDuration,
          fromHighlighted: true,
        });
      }
      this.highlightedPoints.delete(id);
    });
  }
  
  unhighlightLines(lineIds, options = {}) {
    lineIds.forEach(id => {
      if (!options.noAnimation && this.highlightedLines.has(id)) {
        this.lineAnimations.set(id, {
          type: 'fadeOut',
          startTime: performance.now(),
          duration: ANIMATION_CONFIG.fadeOutDuration,
          fromHighlighted: true,
        });
      }
      this.highlightedLines.delete(id);
    });
  }
  
  unhighlightPlanes(planeIds, options = {}) {
    planeIds.forEach(id => {
      if (!options.noAnimation && this.highlightedPlanes.has(id)) {
        this.planeAnimations.set(id, {
          type: 'fadeOut',
          startTime: performance.now(),
          duration: ANIMATION_CONFIG.fadeOutDuration,
          fromHighlighted: true,
        });
      }
      this.highlightedPlanes.delete(id);
    });
  }
  
  unhighlightLabels(labelIds, options = {}) {
    labelIds.forEach(id => {
      if (!options.noAnimation && this.highlightedLabels.has(id)) {
        this.labelAnimations.set(id, {
          type: 'fadeOut',
          startTime: performance.now(),
          duration: ANIMATION_CONFIG.fadeOutDuration,
          fromHighlighted: true,
        });
      }
      this.highlightedLabels.delete(id);
    });
  }
  
  clearAll(options = {}) {
    this.unhighlightPoints([...this.highlightedPoints], options);
    this.unhighlightLines([...this.highlightedLines], options);
    this.unhighlightPlanes([...this.highlightedPlanes], options);
    this.unhighlightLabels([...this.highlightedLabels], options);
  }
  
  setHighlights(points = [], lines = [], planes = [], labels = [], options = {}) {
    const currentPoints = new Set(this.highlightedPoints);
    const currentLines = new Set(this.highlightedLines);
    const currentPlanes = new Set(this.highlightedPlanes);
    const currentLabels = new Set(this.highlightedLabels);
    
    const newPoints = new Set(points);
    const newLines = new Set(lines);
    const newPlanes = new Set(planes);
    const newLabels = new Set(labels);
    
    const toAddPoints = [...newPoints].filter(p => !currentPoints.has(p));
    const toRemovePoints = [...currentPoints].filter(p => !newPoints.has(p));
    
    const toAddLines = [...newLines].filter(l => !currentLines.has(l));
    const toRemoveLines = [...currentLines].filter(l => !newLines.has(l));
    
    const toAddPlanes = [...newPlanes].filter(p => !currentPlanes.has(p));
    const toRemovePlanes = [...currentPlanes].filter(p => !newPlanes.has(p));
    
    const toAddLabels = [...newLabels].filter(l => !currentLabels.has(l));
    const toRemoveLabels = [...newLabels].filter(l => !currentLabels.has(l));
    
    this.highlightPoints(toAddPoints, options);
    this.highlightLines(toAddLines, options);
    this.highlightPlanes(toAddPlanes, options);
    this.highlightLabels(toAddLabels, options);
    
    this.unhighlightPoints(toRemovePoints, options);
    this.unhighlightLines(toRemoveLines, options);
    this.unhighlightPlanes(toRemovePlanes, options);
    this.unhighlightLabels(toRemoveLabels, options);
  }
  
  getPointState(pointId) {
    const isHighlighted = this.highlightedPoints.has(pointId);
    const anim = this.pointAnimations.get(pointId);

    if (!anim) {
      if (isHighlighted) {
        const pulseT = (performance.now() % ANIMATION_CONFIG.pulseDuration) / ANIMATION_CONFIG.pulseDuration;
        const scale = 1.4 + 0.25 * Math.sin(pulseT * Math.PI * 2);
        return {
          highlighted: true,
          opacity: 1.0,
          scale,
          color: this.currentColor,
        };
      }
      return { highlighted: false, opacity: 1.0, scale: 1.0, color: null };
    }

    const now = performance.now();
    const elapsed = now - anim.startTime;
    const t = Math.min(1, elapsed / anim.duration);

    if (anim.type === 'fadeIn') {
      const eased = easeOutCubic(t);
      return {
        highlighted: true,
        opacity: 1.0,
        scale: 1.0 + 0.5 * eased,
        color: this.currentColor,
      };
    } else if (anim.type === 'fadeOut') {
      const eased = easeInCubic(t);
      const result = {
        highlighted: false,
        opacity: 1.0,
        scale: 1.5 - 0.5 * eased,
        color: null,
      };
      if (t >= 1) {
        this.pointAnimations.delete(pointId);
      }
      return result;
    }

    return { highlighted: isHighlighted, opacity: 1.0, scale: 1.0, color: isHighlighted ? this.currentColor : null };
  }
  
  getLineState(lineId) {
    const isHighlighted = this.highlightedLines.has(lineId);
    const anim = this.lineAnimations.get(lineId);
    
    if (!anim) {
      if (isHighlighted) {
        const pulseT = (performance.now() % ANIMATION_CONFIG.pulseDuration) / ANIMATION_CONFIG.pulseDuration;
        const wave = 0.5 + 0.5 * Math.sin(pulseT * Math.PI * 2);
        return {
          highlighted: true,
          color: this.currentColor,
          opacity: 0.55 + 0.45 * wave,
          pulse: true,
        };
      }
      return { highlighted: false, color: null, opacity: null, pulse: false };
    }
    
    const now = performance.now();
    const elapsed = now - anim.startTime;
    const t = Math.min(1, elapsed / anim.duration);
    
    if (anim.type === 'fadeIn') {
      const eased = easeOutCubic(t);
      return {
        highlighted: true,
        color: this.currentColor,
        opacity: 0.3 + 0.7 * eased,
        pulse: false,
      };
    } else if (anim.type === 'fadeOut') {
      const eased = easeInCubic(t);
      const result = {
        highlighted: false,
        color: null,
        opacity: 1.0 - 0.7 * eased,
        pulse: false,
      };
      if (t >= 1) {
        this.lineAnimations.delete(lineId);
      }
      return result;
    }
    
    return { highlighted: isHighlighted, color: null, opacity: null, pulse: false };
  }
  
  getPlaneState(planeId) {
    const isHighlighted = this.highlightedPlanes.has(planeId);
    const anim = this.planeAnimations.get(planeId);
    
    if (!anim) {
      return {
        highlighted: isHighlighted,
        opacity: isHighlighted ? 0.5 : 0.3,
        color: isHighlighted ? this.currentColor : '#4A90E2',
      };
    }
    
    const now = performance.now();
    const elapsed = now - anim.startTime;
    const t = Math.min(1, elapsed / anim.duration);
    
    if (anim.type === 'fadeIn') {
      const eased = easeOutCubic(t);
      return {
        highlighted: true,
        opacity: 0.3 + 0.2 * eased,
        color: this.currentColor,
      };
    } else if (anim.type === 'fadeOut') {
      const eased = easeInCubic(t);
      const result = {
        highlighted: false,
        opacity: 0.5 - 0.2 * eased,
        color: '#4A90E2',
      };
      if (t >= 1) {
        this.planeAnimations.delete(planeId);
      }
      return result;
    }
    
    return { highlighted: isHighlighted, opacity: 0.3, color: '#4A90E2' };
  }
  
  getLabelState(labelId) {
    const isHighlighted = this.highlightedLabels.has(labelId);
    const anim = this.labelAnimations.get(labelId);
    
    if (!anim) {
      return {
        highlighted: isHighlighted,
        opacity: 1.0,
        scale: isHighlighted ? 1.3 : 1.0,
        color: isHighlighted ? this.currentColor : null,
      };
    }
    
    const now = performance.now();
    const elapsed = now - anim.startTime;
    const t = Math.min(1, elapsed / anim.duration);
    
    if (anim.type === 'fadeIn') {
      const eased = easeOutCubic(t);
      return {
        highlighted: true,
        opacity: 1.0,
        scale: 1.0 + 0.3 * eased,
        color: this.currentColor,
      };
    } else if (anim.type === 'fadeOut') {
      const eased = easeInCubic(t);
      const result = {
        highlighted: false,
        opacity: 1.0,
        scale: 1.3 - 0.3 * eased,
        color: null,
      };
      if (t >= 1) {
        this.labelAnimations.delete(labelId);
      }
      return result;
    }
    
    return { highlighted: isHighlighted, opacity: 1.0, scale: 1.0, color: null };
  }
  
  isAnimating() {
    return (
      this.pointAnimations.size > 0 ||
      this.lineAnimations.size > 0 ||
      this.planeAnimations.size > 0 ||
      this.labelAnimations.size > 0 ||
      this.highlightedLines.size > 0 ||
      this.highlightedPoints.size > 0
    );
  }
  
  update() {
    const now = performance.now();
    const delta = now - this.lastUpdate;
    this.lastUpdate = now;
    
    this.pointAnimations.forEach((anim, id) => {
      const elapsed = now - anim.startTime;
      if (elapsed >= anim.duration) {
        this.pointAnimations.delete(id);
      }
    });
    
    this.lineAnimations.forEach((anim, id) => {
      const elapsed = now - anim.startTime;
      if (elapsed >= anim.duration) {
        this.lineAnimations.delete(id);
      }
    });
    
    this.planeAnimations.forEach((anim, id) => {
      const elapsed = now - anim.startTime;
      if (elapsed >= anim.duration) {
        this.planeAnimations.delete(id);
      }
    });
    
    this.labelAnimations.forEach((anim, id) => {
      const elapsed = now - anim.startTime;
      if (elapsed >= anim.duration) {
        this.labelAnimations.delete(id);
      }
    });
    
    return this.isAnimating();
  }
}

export const HIGHLIGHT_COLORS_CONST = HIGHLIGHT_COLORS;
export const ANIMATION_CONFIG_CONST = ANIMATION_CONFIG;
