import './style.css';
import { App } from './App';
import { ExampleCube } from './entities/ExampleCube';
import { AmbientLight } from './entities/AmbientLight';

const canvas = document.querySelector<HTMLCanvasElement>('#canvas');
if (!canvas) throw new Error('No #canvas element found');

const debug = true;

const app = new App(canvas, debug);
app.add(new AmbientLight()).add(new ExampleCube());

app.start();

// Optional: clean up on HMR / page unload
if (import.meta.hot) {
    import.meta.hot.dispose(() => app.dispose());
}
