export class DogStats {
  constructor() {
    this.health = 100;
    this.hunger = 100;
    this.mood = 50;
    this.state = 'idle'; // 'walk', 'run', 'jump', 'eating', 'idle'

    this.createUI();
  }

  createUI() {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '10px';
    container.style.left = '10px';
    container.style.color = 'white';
    container.style.fontFamily = 'Arial';
    container.style.fontSize = '14px';
    container.style.zIndex = 999;
    container.style.background = 'rgba(0,0,0,0.5)';
    container.style.padding = '10px';
    container.style.borderRadius = '5px';

    this.bars = {
      health: this.createBar('Health', 'green'),
      hunger: this.createBar('Hunger', 'orange'),
      mood: this.createBar('Mood', 'blue'),
    };

    Object.values(this.bars).forEach(bar => container.appendChild(bar.wrapper));
    document.body.appendChild(container);
  }

  createBar(label, color) {
    const wrapper = document.createElement('div');
    wrapper.style.marginBottom = '8px';

    const text = document.createElement('div');
    text.textContent = label;
    text.style.marginBottom = '2px';

    const bar = document.createElement('div');
    bar.style.width = '100px';
    bar.style.height = '10px';
    bar.style.background = '#444';

    const fill = document.createElement('div');
    fill.style.height = '100%';
    fill.style.width = '100%';
    fill.style.background = color;
    fill.style.transition = 'width 0.2s ease';

    bar.appendChild(fill);
    wrapper.appendChild(text);
    wrapper.appendChild(bar);

    return { wrapper, fill };
  }

  updateBars() {
    this.bars.health.fill.style.width = `${this.health}%`;
    this.bars.hunger.fill.style.width = `${this.hunger}%`;
    this.bars.mood.fill.style.width = `${this.mood}%`;
  }

  setState(state) {
    this.state = state;
  }

  update(delta) {
    // Hunger decreases only if dog is moving (walk, run, jump)
    if (['walk', 'run', 'jump'].includes(this.state)) {
      this.hunger -= delta * 3; // slower drop
      if (this.hunger < 0) this.hunger = 0;
    }

    // Mood decreases slowly if hunger low (<30)
    if (this.hunger < 30) {
      this.mood -= delta * 1.5; // slower drop
      if (this.mood < 0) this.mood = 0;
    }

    // If eating, hunger and mood increase gently
    if (this.state === 'eating') {
      this.hunger += delta * 10;
      if (this.hunger > 100) this.hunger = 100;

      this.mood += delta * 3;
      if (this.mood > 100) this.mood = 100;
    }

    // Health drops very slowly while moving
    if (['walk', 'run', 'jump'].includes(this.state)) {
      this.health -= delta;
      if (this.health < 0) this.health = 0;
    }

    this.updateBars();
  }
}

export function updateDogStats(dogStats, { isMoving, isEating, delta }) {
  // Mood drops if very hungry and not eating
  if (dogStats.hunger < 30 && !isEating) {
    dogStats.mood = Math.max(0, dogStats.mood - delta * 2);
  }

  if (isEating) {
    dogStats.setState('eating');
  } else if (isMoving) {
    dogStats.setState('walk'); // simplified
  } else {
    dogStats.setState('idle');
  }

  dogStats.update(delta);
}

export function createStatsUI(dogStats) {
  dogStats.updateBars();
}
