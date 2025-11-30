class NetworkVisualizer {
    constructor(canvasId, onClick) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.nodes = []; // { id, x, y, vx, vy }
        this.connections = []; // [nodeId1, nodeId2]
        this.onClick = onClick;

        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.canvas.addEventListener('click', (e) => this.handleClick(e));

        this.animate();
    }

    handleClick(e) {
        if (!this.onClick) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check if clicked on a node
        for (const node of this.nodes) {
            const dist = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
            if (dist < 10) { // 10px radius hit area
                this.onClick(node.id);
                return;
            }
        }
    }

    resize() {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = 300; // Fixed height for sidebar
    }

    addNode(id) {
        if (this.nodes.find(n => n.id === id)) return;

        this.nodes.push({
            id: id,
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5
        });
    }

    removeNode(id) {
        this.nodes = this.nodes.filter(n => n.id !== id);
        this.connections = this.connections.filter(c => c[0] !== id && c[1] !== id);
    }

    addConnection(id1, id2) {
        // Ensure unique connection
        if (!this.connections.find(c => (c[0] === id1 && c[1] === id2) || (c[0] === id2 && c[1] === id1))) {
            this.connections.push([id1, id2]);
        }
    }

    update() {
        this.nodes.forEach(node => {
            node.x += node.vx;
            node.y += node.vy;

            // Bounce off walls
            if (node.x < 0 || node.x > this.canvas.width) node.vx *= -1;
            if (node.y < 0 || node.y > this.canvas.height) node.vy *= -1;
        });
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw connections
        this.ctx.strokeStyle = '#d1d5db'; // mono-300
        this.ctx.lineWidth = 1;
        this.connections.forEach(conn => {
            const n1 = this.nodes.find(n => n.id === conn[0]);
            const n2 = this.nodes.find(n => n.id === conn[1]);
            if (n1 && n2) {
                this.ctx.beginPath();
                this.ctx.moveTo(n1.x, n1.y);
                this.ctx.lineTo(n2.x, n2.y);
                this.ctx.stroke();
            }
        });

        // Draw nodes
        this.nodes.forEach(node => {
            this.ctx.fillStyle = '#1f2937'; // mono-800
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, 4, 0, Math.PI * 2);
            this.ctx.fill();

            // Label (optional)
            // this.ctx.fillStyle = '#6b7280';
            // this.ctx.font = '10px Inter';
            // this.ctx.fillText(node.id.substr(0, 4), node.x + 6, node.y + 3);
        });
    }

    animate() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}
