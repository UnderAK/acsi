class MathSymbolAnimation {
    constructor(root) {
        this.root = root;
        this.symbols = [];
        this.lines = [];
        this.effects = [];
        this.frame = null;
        this.lastTime = 0;
        this.pointer = {
            x: 0,
            y: 0,
            px: 0,
            py: 0,
            vx: 0,
            vy: 0,
            active: false
        };
        this.bounds = { width: 0, height: 0 };
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.resizeObserver = new ResizeObserver(() => this.reset());
        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handlePointerLeave = this.handlePointerLeave.bind(this);
        this.handleClick = this.handleClick.bind(this);
    }

    init() {
        this.root.classList.add('is-ready');
        this.root.innerHTML = '<div class="math-tooltip" role="tooltip"></div>';
        this.tooltip = this.root.querySelector('.math-tooltip');
        this.resizeObserver.observe(this.root);
        this.root.addEventListener('pointermove', this.handlePointerMove);
        this.root.addEventListener('pointerleave', this.handlePointerLeave);
        this.root.addEventListener('click', this.handleClick);
        this.reset();
    }

    reset() {
        this.stop();
        this.root.querySelectorAll('.math-symbol').forEach((node) => node.remove());
        this.effects.forEach((effect) => effect.remove());
        this.effects = [];
        this.symbols = [];
        this.lines = [];
        this.bounds = {
            width: this.root.clientWidth,
            height: this.root.clientHeight
        };

        if (!this.bounds.width || !this.bounds.height) return;

        const count = this.getSymbolCount();
        const items = this.getItems().slice(0, count);

        items.forEach((item, index) => {
            const node = document.createElement('button');
            node.type = 'button';
            node.className = `math-symbol math-symbol--${item.kind || 'text'}`;
            node.textContent = item.text;
            node.setAttribute('aria-label', `${item.text}: ${item.tip}`);
            node.dataset.tip = item.tip;
            this.root.appendChild(node);

            const sizeScale = window.innerWidth < 560 ? 0.52 : window.innerWidth < 900 ? 0.7 : 1;
            const size = this.random(92, 164) * (item.size || 1) * sizeScale;
            const radius = size * 0.48;
            const symbol = {
                item,
                node,
                x: this.random(radius, this.bounds.width - radius),
                y: this.reducedMotion ? this.random(this.bounds.height * 0.58, this.bounds.height - radius) : this.random(-this.bounds.height * 0.55, -radius),
                vx: this.random(-26, 26),
                vy: this.reducedMotion ? 0 : this.random(120, 260),
                angle: this.random(-0.7, 0.7),
                angularVelocity: this.random(-1.2, 1.2),
                radius,
                mass: radius * radius,
                settled: this.reducedMotion,
                hover: false,
                idleSeed: this.random(0, Math.PI * 2),
                index
            };

            node.style.width = `${size}px`;
            node.style.height = `${size}px`;
            node.style.fontSize = `${Math.max(15, size * 0.48)}px`;
            node.addEventListener('pointerenter', () => this.showTooltip(symbol));
            node.addEventListener('pointerleave', () => this.hideTooltip(symbol));
            node.addEventListener('focus', () => this.showTooltip(symbol));
            node.addEventListener('blur', () => this.hideTooltip(symbol));
            this.symbols.push(symbol);
        });

        this.render(0);

        if (!this.reducedMotion) {
            this.frame = requestAnimationFrame((time) => this.tick(time));
        }
    }

    getSymbolCount() {
        if (window.innerWidth < 560) return 5;
        if (window.innerWidth < 900) return 8;
        return 12;
    }

    getItems() {
        return [
            { text: 'π', tip: 'The ratio of a circle’s circumference to its diameter.', kind: 'pi' },
            { text: '∑', tip: 'Represents the sum of a sequence of values.', kind: 'sum' },
            { text: '∫', tip: 'Represents integration or continuous accumulation.', kind: 'integral' },
            { text: '√', tip: 'Represents a square root.', kind: 'root' },
            { text: '∞', tip: 'Represents something unlimited or without an endpoint.', kind: 'infinity' },
            { text: 'Δ', tip: 'Represents change or a triangle in geometry.', kind: 'delta' },
            { text: 'θ', tip: 'Often represents an angle.', kind: 'theta' },
            { text: 'φ', tip: 'Often represents the golden ratio or an angle.', kind: 'phi' },
            { text: '≈', tip: 'Means approximately equal.', kind: 'logic' },
            { text: '≠', tip: 'Means not equal.', kind: 'logic' },
            { text: '∀', tip: 'Means “for all” in mathematical logic.', kind: 'logic' },
            { text: '∃', tip: 'Means “there exists.”', kind: 'logic' },
            { text: '⇒', tip: 'Represents logical implication.', kind: 'logic' },
            { text: '∧', tip: 'Logical AND.', kind: 'logic' },
            { text: '∨', tip: 'Logical OR.', kind: 'logic' },
            { text: 'x²+y²', tip: 'A compact equation for circular geometry.', kind: 'equation', size: 1.2 },
            { text: 'f(n)', tip: 'A function notation used in math and algorithms.', kind: 'equation', size: 1.05 },
            { text: '△', tip: 'A triangle, a core geometric shape.', kind: 'shape' },
            { text: '◇', tip: 'A geometric diamond shape.', kind: 'shape' },
            { text: '⊕', tip: 'Exclusive OR, a common logic gate operation.', kind: 'logic' },
            { text: '↗', tip: 'A coordinate-axis direction vector.', kind: 'axis' },
            { text: 'φₙ', tip: 'A nod to Fibonacci growth and golden-ratio patterns.', kind: 'spiral' }
        ];
    }

    tick(time) {
        const dt = Math.min((time - (this.lastTime || time)) / 1000, 0.033);
        this.lastTime = time;
        this.update(dt || 0.016, time / 1000);
        this.render(time / 1000);
        this.frame = requestAnimationFrame((next) => this.tick(next));
    }

    update(dt, time) {
        const gravity = 1500;
        const bounce = 0.34;
        const friction = 0.972;
        const collectionX = this.bounds.width * 0.32;

        this.symbols.forEach((symbol) => {
            if (symbol.hover) {
                symbol.vx *= 0.86;
                symbol.vy *= 0.78;
                symbol.angularVelocity *= 0.82;
            }

            symbol.vy += gravity * dt;

            if (symbol.y > this.bounds.height * 0.52) {
                symbol.vx += (collectionX - symbol.x) * 0.18 * dt;
            }

            if (this.pointer.active) {
                const dx = symbol.x - this.pointer.x;
                const dy = symbol.y - this.pointer.y;
                const distance = Math.max(Math.hypot(dx, dy), 1);
                const range = 130;

                if (distance < range) {
                    const strength = (1 - distance / range) ** 2;
                    const fastMove = Math.min(Math.hypot(this.pointer.vx, this.pointer.vy) / 18, 2.2);
                    symbol.vx += (dx / distance) * strength * (220 + fastMove * 90) * dt;
                    symbol.vy += (dy / distance) * strength * (150 + fastMove * 70) * dt;
                    symbol.vx += this.pointer.vx * strength * 0.025;
                    symbol.vy += this.pointer.vy * strength * 0.018;
                    symbol.angularVelocity += strength * this.pointer.vx * 0.006;
                }
            }

            symbol.x += symbol.vx * dt;
            symbol.y += symbol.vy * dt;
            symbol.angle += symbol.angularVelocity * dt;

            this.solveBounds(symbol, bounce);
            symbol.vx *= friction;
            symbol.angularVelocity *= 0.985;

            if (Math.abs(symbol.vx) < 2 && Math.abs(symbol.vy) < 2 && symbol.y > this.bounds.height - symbol.radius - 12) {
                symbol.settled = true;
            }

            symbol.idle = this.getIdleTransform(symbol, time);
        });

        this.solveCollisions();
    }

    solveBounds(symbol, bounce) {
        const left = symbol.radius;
        const right = this.bounds.width - symbol.radius;
        const top = symbol.radius;
        const bottom = this.bounds.height - symbol.radius;

        if (symbol.x < left) {
            symbol.x = left;
            symbol.vx = Math.abs(symbol.vx) * bounce;
            symbol.angularVelocity *= 0.7;
        }

        if (symbol.x > right) {
            symbol.x = right;
            symbol.vx = -Math.abs(symbol.vx) * bounce;
            symbol.angularVelocity *= 0.7;
        }

        if (symbol.y < top) {
            symbol.y = top;
            symbol.vy = Math.abs(symbol.vy) * bounce;
        }

        if (symbol.y > bottom) {
            symbol.y = bottom;
            symbol.vy = -Math.abs(symbol.vy) * bounce;
            symbol.vx *= 0.78;
            symbol.angularVelocity += symbol.vx * 0.002;
        }
    }

    solveCollisions() {
        for (let i = 0; i < this.symbols.length; i += 1) {
            for (let j = i + 1; j < this.symbols.length; j += 1) {
                const a = this.symbols[i];
                const b = this.symbols[j];
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const distance = Math.max(Math.hypot(dx, dy), 0.01);
                const minDistance = a.radius + b.radius;

                if (distance >= minDistance) continue;

                const overlap = (minDistance - distance) * 0.5;
                const nx = dx / distance;
                const ny = dy / distance;

                a.x -= nx * overlap;
                a.y -= ny * overlap;
                b.x += nx * overlap;
                b.y += ny * overlap;

                const relativeVelocityX = b.vx - a.vx;
                const relativeVelocityY = b.vy - a.vy;
                const impact = relativeVelocityX * nx + relativeVelocityY * ny;

                if (impact > 0) continue;

                const impulse = -(1 + 0.34) * impact / (1 / a.mass + 1 / b.mass);
                a.vx -= (impulse * nx) / a.mass;
                a.vy -= (impulse * ny) / a.mass;
                b.vx += (impulse * nx) / b.mass;
                b.vy += (impulse * ny) / b.mass;
            }
        }
    }

    getIdleTransform(symbol, time) {
        if (!symbol.settled) return { x: 0, y: 0, rotate: 0, scale: 1 };

        const wave = Math.sin(time * 1.2 + symbol.idleSeed);
        const slow = Math.sin(time * 0.8 + symbol.idleSeed);

        switch (symbol.item.kind) {
            case 'pi':
                return { x: 0, y: 0, rotate: wave * 0.08, scale: 1 };
            case 'sum':
                return { x: 0, y: 0, rotate: 0, scale: 1 + slow * 0.035 };
            case 'integral':
                return { x: 0, y: wave * 2.5, rotate: 0, scale: 1 };
            case 'delta':
            case 'shape':
                return { x: 0, y: 0, rotate: time * 0.08 + symbol.idleSeed, scale: 1 };
            case 'infinity':
                symbol.node.style.setProperty('--symbol-glow', `${0.35 + Math.abs(wave) * 0.4}`);
                return { x: 0, y: 0, rotate: 0, scale: 1 };
            case 'axis':
                return { x: slow * 2, y: wave * 2, rotate: 0, scale: 1 };
            case 'equation':
                return { x: 0, y: 0, rotate: 0, scale: 1 + (Math.sin(time * 0.45 + symbol.idleSeed) > 0.92 ? 0.045 : 0) };
            default:
                return { x: 0, y: 0, rotate: 0, scale: 1 };
        }
    }

    render(time) {
        this.symbols.forEach((symbol) => {
            const idle = symbol.idle || { x: 0, y: 0, rotate: 0, scale: 1 };
            const hoverScale = symbol.hover ? 1.13 : 1;
            symbol.node.style.transform = `translate(${symbol.x - symbol.radius + idle.x}px, ${symbol.y - symbol.radius + idle.y}px) rotate(${symbol.angle + idle.rotate}rad) scale(${idle.scale * hoverScale})`;
            symbol.node.classList.toggle('is-settled', symbol.settled);
        });

    }

    showTooltip(symbol) {
        symbol.hover = true;
        symbol.node.classList.add('is-hovered');
        this.tooltip.textContent = `${symbol.item.text} — ${symbol.item.tip}`;
        this.tooltip.classList.add('is-visible');
        this.positionTooltip(symbol);
    }

    hideTooltip(symbol) {
        symbol.hover = false;
        symbol.node.classList.remove('is-hovered');
        this.tooltip.classList.remove('is-visible');
    }

    positionTooltip(symbol) {
        const x = Math.min(Math.max(symbol.x + 12, 8), this.bounds.width - 180);
        const y = Math.min(Math.max(symbol.y - 42, 8), this.bounds.height - 56);
        this.tooltip.style.transform = `translate(${x}px, ${y}px)`;
    }

    handlePointerMove(event) {
        const rect = this.root.getBoundingClientRect();
        this.pointer.px = this.pointer.x;
        this.pointer.py = this.pointer.y;
        this.pointer.x = event.clientX - rect.left;
        this.pointer.y = event.clientY - rect.top;
        this.pointer.vx = this.pointer.x - this.pointer.px;
        this.pointer.vy = this.pointer.y - this.pointer.py;
        this.pointer.active = true;
    }

    handlePointerLeave() {
        this.pointer.active = false;
    }

    handleClick(event) {
        const rect = this.root.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.className = 'math-ripple';
        ripple.style.left = `${event.clientX - rect.left}px`;
        ripple.style.top = `${event.clientY - rect.top}px`;
        this.root.appendChild(ripple);
        this.effects.push(ripple);
        ripple.addEventListener('animationend', () => {
            ripple.remove();
            this.effects = this.effects.filter((effect) => effect !== ripple);
        }, { once: true });
    }

    random(min, max) {
        return min + Math.random() * (max - min);
    }

    stop() {
        if (this.frame) {
            cancelAnimationFrame(this.frame);
            this.frame = null;
        }
    }

    destroy() {
        this.stop();
        this.resizeObserver.disconnect();
        this.root.removeEventListener('pointermove', this.handlePointerMove);
        this.root.removeEventListener('pointerleave', this.handlePointerLeave);
        this.root.removeEventListener('click', this.handleClick);
    }
}

const mountMathSymbols = () => {
    const root = document.querySelector('[data-math-symbols]');
    if (!root) return;

    const animation = new MathSymbolAnimation(root);
    animation.init();
    window.acsiMathSymbols = animation;
};

if ('requestIdleCallback' in window) {
    requestIdleCallback(mountMathSymbols, { timeout: 900 });
} else {
    window.addEventListener('load', mountMathSymbols, { once: true });
}
