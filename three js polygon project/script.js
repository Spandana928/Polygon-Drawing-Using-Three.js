class Polygon { 
    constructor(scene) {
        this.scene = scene;
        this.vertices = [];
        this.lines = [];
        this.shape = null;
    }

    addVertex(position) {
        this.vertices.push(position);

        if (this.vertices.length > 1) {
            const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
            const geometry = new THREE.BufferGeometry().setFromPoints(this.vertices);
            const line = new THREE.Line(geometry, material);
            this.lines.push(line);
            this.scene.add(line);
        }
    }

    complete() {
        if (this.vertices.length < 3) return;

        const shape = new THREE.Shape();
        this.vertices.forEach((v, i) => {
            if (i === 0) shape.moveTo(v.x, v.y);
            else shape.lineTo(v.x, v.y);
        });
        shape.closePath();

        const material = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
        const shapeGeometry = new THREE.ShapeGeometry(shape);
        this.shape = new THREE.Mesh(shapeGeometry, material);
        this.scene.add(this.shape);

        // Add polygon edges
        const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
        const edgesGeometry = new THREE.BufferGeometry().setFromPoints([...this.vertices, this.vertices[0]]);
        const edges = new THREE.LineLoop(edgesGeometry, edgesMaterial);
        this.scene.add(edges);
        this.lines.push(edges);
    }

    clone(scene) {
        if (!this.shape) return null;

        const clone = new Polygon(scene);
        clone.vertices = this.vertices.map(v => v.clone());

        // Clone filled shape
        const shape = new THREE.Shape();
        clone.vertices.forEach((v, i) => {
            if (i === 0) shape.moveTo(v.x, v.y);
            else shape.lineTo(v.x, v.y);
        });
        shape.closePath();

        const material = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
        const shapeGeometry = new THREE.ShapeGeometry(shape);
        clone.shape = new THREE.Mesh(shapeGeometry, material);
        scene.add(clone.shape);

        // Clone edges
        const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
        const edgesGeometry = new THREE.BufferGeometry().setFromPoints([...clone.vertices, clone.vertices[0]]);
        clone.edges = new THREE.LineLoop(edgesGeometry, edgesMaterial);
        scene.add(clone.edges);

        return clone;
    }

    clear() {
        this.lines.forEach(line => this.scene.remove(line));
        if (this.shape) this.scene.remove(this.shape);
        this.vertices = [];
        this.lines = [];
        this.shape = null;
    }
}

class PolygonApp {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 1, 100);
        this.camera.position.set(0, 0, 10);
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.setupScene();
        this.polygon = new Polygon(this.scene);
        this.tempPolygon = null;

        window.addEventListener("resize", () => this.onResize());
        this.renderer.domElement.addEventListener("click", (e) => this.onMouseClick(e));

        document.getElementById("completePolygon").addEventListener("click", () => this.completePolygon());
        document.getElementById("copyPolygon").addEventListener("click", () => this.copyPolygon());
        document.getElementById("resetScene").addEventListener("click", () => this.resetScene());

        this.animate();
    }

    setupScene() {
        this.scene.background = new THREE.Color(0x000000);
    
        // Increase grid size slightly
        const size = 7;  // Increased from 5 to 7
        const divisions = 14;  // More divisions for finer grid
    
        const step = size / divisions;
        const gridMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.3, transparent: true });
    
        const gridGeometry = new THREE.BufferGeometry();
        const gridVertices = [];
    
        // Generate grid lines without an outer border
        for (let i = -size / 2 + step; i < size / 2; i += step) {
            gridVertices.push(new THREE.Vector3(i, -size / 2, 0));
            gridVertices.push(new THREE.Vector3(i, size / 2, 0));
    
            gridVertices.push(new THREE.Vector3(-size / 2, i, 0));
            gridVertices.push(new THREE.Vector3(size / 2, i, 0));
        }
    
        gridGeometry.setFromPoints(gridVertices);
        const gridLines = new THREE.LineSegments(gridGeometry, gridMaterial);
        this.scene.add(gridLines);
    }
    
    

    onResize() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onMouseClick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        const vector = new THREE.Vector3(x, y, 0).unproject(this.camera);
        this.polygon.addVertex(vector);
    }

    completePolygon() {
        this.polygon.complete();
    }
    copyPolygon() {
        if (!this.polygon.shape) return;
    
        // Clone the polygon
        this.tempPolygon = this.polygon.clone(this.scene);
        if (!this.tempPolygon || !this.tempPolygon.shape) return;
    
        this.scene.add(this.tempPolygon.shape);
    
        // Disable adding vertices while moving the copy
        this.isCopying = true;
        this.renderer.domElement.removeEventListener("click", this.onMouseClick);
    
        // Move with cursor
        this.renderer.domElement.addEventListener("mousemove", this.moveCopiedPolygon);
    
        // Use **right-click (contextmenu) instead of left-click to place it**
        this.renderer.domElement.addEventListener("contextmenu", this.placeCopiedPolygon);
    }
    
    moveCopiedPolygon = (event) => {
        if (!this.tempPolygon || !this.tempPolygon.shape) return;
    
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
        const vector = new THREE.Vector3(x, y, 0).unproject(this.camera);
        this.tempPolygon.shape.position.set(vector.x, vector.y, 0);
    };
    
    placeCopiedPolygon = (event) => {
        event.preventDefault(); // Prevents browser context menu
    
        if (!this.tempPolygon) return;
    
        // Stop copying and remove movement event
        this.isCopying = false;
        this.renderer.domElement.removeEventListener("mousemove", this.moveCopiedPolygon);
        this.renderer.domElement.removeEventListener("contextmenu", this.placeCopiedPolygon);
    
        // Restore left-click for normal polygon drawing
        setTimeout(() => {
            this.renderer.domElement.addEventListener("click", this.onMouseClick);
        }, 100);
    
        this.tempPolygon = null;
    };
    
    
    resetScene() {
        this.scene.children = [];
        this.setupScene();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }
}

new PolygonApp();

