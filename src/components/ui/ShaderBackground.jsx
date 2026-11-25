'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

const VERTEX_SHADER = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// Gradien aurora lembut & minimalis (tenang, tidak mencolok)
const FRAGMENT_SHADER = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  vec2 mouse = (u_mouse - 0.5) * vec2(aspect, 1.0);
  float t = u_time * 0.12;

  // Dua pendaran lembut yang bergerak sangat pelan
  vec2 center1 = vec2(sin(t * 0.7) * 0.35, cos(t * 0.5) * 0.25) + mouse * 0.08;
  vec2 center2 = vec2(cos(t * 0.6) * -0.4, sin(t * 0.4) * -0.28) - mouse * 0.05;

  float blob1 = exp(-dot(p - center1, p - center1) * 1.4);
  float blob2 = exp(-dot(p - center2, p - center2) * 1.6);

  vec3 base   = vec3(0.024, 0.035, 0.086); // #060916
  vec3 indigo = vec3(0.110, 0.129, 0.360); // indigo redup yang lembut
  vec3 teal   = vec3(0.055, 0.220, 0.290); // teal gelap yang tenang

  vec3 col = base;
  col = mix(col, indigo, blob1 * 0.55);
  col = mix(col, teal, blob2 * 0.38);

  // Vignette lembut di pinggir layar
  float vig = smoothstep(1.35, 0.25, length((uv - 0.5) * vec2(aspect * 0.85, 1.0)));
  col *= mix(0.55, 1.0, vig);

  // Dither ringan untuk mencegah banding
  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;

  gl_FragColor = vec4(col, 1.0);
}
`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export default function ShaderBackground({ className }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) return;

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Shader link error:', gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const positionLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, 'u_resolution');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uMouse = gl.getUniformLocation(program, 'u_mouse');

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const target = { x: 0.5, y: 0.5 };
    const mouse = { x: 0.5, y: 0.5 };
    let frameId = 0;
    const start = performance.now();

    function resize() {
      // Gradien halus tidak butuh resolusi penuh: render setengah skala demi performa
      const scale = Math.min(window.devicePixelRatio || 1, 2) * 0.5;
      const width = Math.max(1, Math.floor(canvas.clientWidth * scale));
      const height = Math.max(1, Math.floor(canvas.clientHeight * scale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    }

    function render(now) {
      resize();
      // Interpolasi smoothing posisi kursor
      mouse.x += (target.x - mouse.x) * 0.045;
      mouse.y += (target.y - mouse.y) * 0.045;

      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, reduceMotion ? 12.0 : (now - start) / 1000);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (!reduceMotion) frameId = requestAnimationFrame(render);
    }

    function handlePointerMove(e) {
      const rect = canvas.getBoundingClientRect();
      target.x = (e.clientX - rect.left) / rect.width;
      target.y = 1 - (e.clientY - rect.top) / rect.height;
      if (reduceMotion) {
        mouse.x = target.x;
        mouse.y = target.y;
        render(performance.now());
      }
    }

    function handleVisibility() {
      cancelAnimationFrame(frameId);
      if (!document.hidden) frameId = requestAnimationFrame(render);
    }

    function handleResize() {
      if (reduceMotion) render(performance.now());
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibility);
    frameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return (
    <div
      className={cn('fixed inset-0 overflow-hidden bg-[#060919]', className)}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
