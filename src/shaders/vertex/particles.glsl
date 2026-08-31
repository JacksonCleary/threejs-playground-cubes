uniform float uTime;
attribute vec3 velocity;

void main() {
    // GPU calculates the new position for thousands of particles simultaneously
    vec3 pos = position + velocity * uTime;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 4.0 * (10.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
}