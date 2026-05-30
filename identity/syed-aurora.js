/* ════════════════════════════════════════════════════════════════════════
   SYED AURORA — the living ambient engine (identity v2).
   ────────────────────────────────────────────────────────────────────────
   A fullscreen WebGL gradient-flow field. A fragment shader runs
   domain-warped fractal noise in the brand palette (coral → magenta →
   violet over paper), breathing on its own and bending toward the cursor
   so the background feels aware of you. This is what takes the identity
   from "decorated" to "alive."

   Dependency-free. One global:  SyedAurora.mount(opts) -> boolean
   Returns false (and changes nothing) when WebGL is unavailable or the
   user prefers reduced motion — callers should keep their CSS-blob
   fallback visible in that case.

       const ok = SyedAurora.mount();        // auto-creates a fixed canvas
       if (ok) document.body.classList.add('aurora-on');  // dim CSS blobs

   opts:
     canvas   — existing <canvas> to use (else one is created + fixed)
     scale    — backing-store scale vs CSS px (default 0.6; blur hides it)
     intensity— overall presence 0..1 (default 0.85)
     zIndex   — stacking (default 0; keep below content)

   Theme-aware: re-reads palette from [data-theme] on the <html> element
   each frame, so light/dark + live toggles just work.
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var VERT = 'attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}';

  // v3 "new age" aurora — domain-warped fbm + aurora curtains + iridescent
  // light rays + fine film grain + a readability-preserving vignette +
  // scroll-parallax. Same palette + engine; just more alive.
  var FRAG = [
    'precision highp float;',
    'uniform vec2 u_res;',
    'uniform float u_time;',
    'uniform vec2 u_mouse;',     // 0..1, eased
    'uniform float u_intensity;',
    'uniform float u_scroll;',   // eased scroll, in viewport-heights
    'uniform vec3 u_c1;',        // coral
    'uniform vec3 u_c2;',        // magenta
    'uniform vec3 u_c3;',        // violet
    'uniform vec3 u_bg;',        // paper / ink base
    'float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}',
    'float noise(vec2 p){vec2 i=floor(p),f=fract(p);float a=hash(i),b=hash(i+vec2(1.,0.)),c=hash(i+vec2(0.,1.)),d=hash(i+vec2(1.,1.));vec2 u=f*f*(3.-2.*f);return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);}',
    'float fbm(vec2 p){float v=0.,a=0.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.0+vec2(1.7,9.2);a*=0.5;}return v;}',
    'void main(){',
    '  vec2 uv=gl_FragCoord.xy/u_res.xy;',
    '  vec2 p=uv; p.x*=u_res.x/u_res.y; p*=2.2;',
    '  p.y+=u_scroll*0.18;',                                  // scroll parallax
    '  float t=u_time*0.04;',
    '  vec2 q=vec2(fbm(p+vec2(0.0,t)),fbm(p+vec2(5.2,1.3)-t*0.8));',
    '  vec2 r=vec2(fbm(p+3.5*q+vec2(1.7,9.2)+0.15*t),fbm(p+3.5*q+vec2(8.3,2.8)-0.12*t));',
    '  float f=fbm(p+3.5*r);',
    '  float curtain=0.5+0.5*sin(uv.x*5.0+r.x*5.0+t*1.6);',   // aurora curtains
    '  float md=distance(uv,u_mouse);',
    '  float m=smoothstep(0.6,0.0,md);',
    '  f=clamp(f+m*0.28,0.0,1.0);',
    '  vec3 col=mix(u_c3,u_c2,smoothstep(0.16,0.62,f));',
    '  col=mix(col,u_c1,smoothstep(0.52,0.96,f));',
    '  col+=0.055*vec3(r.x-r.y)*curtain;',                    // iridescent rays
    '  float g=hash(uv*u_res*0.5+fract(t)*97.0);',
    '  col+=(g-0.5)*0.014;',                                  // fine film grain
    '  float vig=smoothstep(0.2,1.05,length(uv-0.5));',       // 0 centre -> 1 edge
    '  float amt=(0.085+0.20*f+0.20*m)*u_intensity;',
    '  amt*=mix(0.78,1.12,vig);',                             // calm centre, rich edge
    '  col=mix(u_bg,col,clamp(amt,0.0,1.0));',
    '  gl_FragColor=vec4(col,1.0);',
    '}'
  ].join('\n');

  function hexToRGB(hex) {
    hex = (hex || '').replace('#', '').trim();
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    var n = parseInt(hex, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('[aurora] shader: ' + gl.getShaderInfoLog(s)); gl.deleteShader(s); return null;
    }
    return s;
  }

  var SyedAurora = {
    _raf: null,
    mount: function (opts) {
      opts = opts || {};
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;

      var canvas = opts.canvas;
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.className = 'sx-aurora';
        var s = canvas.style;
        s.position = 'fixed'; s.inset = '0'; s.width = '100%'; s.height = '100%';
        s.zIndex = String(opts.zIndex != null ? opts.zIndex : 0);
        s.pointerEvents = 'none'; s.opacity = '0';
        s.transition = 'opacity 1.4s ease';
        document.body.insertBefore(canvas, document.body.firstChild);
      }

      var gl = null;
      try { gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false })
                 || canvas.getContext('experimental-webgl'); } catch (e) {}
      if (!gl) { if (!opts.canvas) canvas.remove(); return false; }

      var vs = compile(gl, gl.VERTEX_SHADER, VERT);
      var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
      if (!vs || !fs) { if (!opts.canvas) canvas.remove(); return false; }
      var prog = gl.createProgram();
      gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { if (!opts.canvas) canvas.remove(); return false; }
      gl.useProgram(prog);

      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      var aPos = gl.getAttribLocation(prog, 'a_pos');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      var U = {
        res: gl.getUniformLocation(prog, 'u_res'),
        time: gl.getUniformLocation(prog, 'u_time'),
        mouse: gl.getUniformLocation(prog, 'u_mouse'),
        intensity: gl.getUniformLocation(prog, 'u_intensity'),
        c1: gl.getUniformLocation(prog, 'u_c1'),
        c2: gl.getUniformLocation(prog, 'u_c2'),
        c3: gl.getUniformLocation(prog, 'u_c3'),
        bg: gl.getUniformLocation(prog, 'u_bg'),
        scroll: gl.getUniformLocation(prog, 'u_scroll'),
      };

      // Lighter on phones/tablets: coarse pointers + small screens get a
      // lower backing-store scale so the shader stays smooth and battery-kind.
      var coarse = (window.matchMedia && matchMedia('(pointer:coarse)').matches)
                   || Math.min(window.innerWidth, window.innerHeight) < 700;
      var scale = opts.scale != null ? opts.scale : (coarse ? 0.4 : 0.6);
      var intensity = opts.intensity != null ? opts.intensity : 0.85;
      function resize() {
        var w = Math.max(1, Math.floor(window.innerWidth * scale));
        var h = Math.max(1, Math.floor(window.innerHeight * scale));
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h);
        }
      }
      window.addEventListener('resize', resize, { passive: true });
      resize();

      // eased pointer in 0..1 (y flipped for GL space) + eased scroll
      var mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5, sc = 0;
      window.addEventListener('mousemove', function (e) {
        tx = e.clientX / window.innerWidth;
        ty = 1.0 - e.clientY / window.innerHeight;
      }, { passive: true });

      var start = (window.performance && performance.now) ? performance.now() : Date.now();
      var self = this;
      function palette() {
        var dark = document.documentElement.getAttribute('data-theme') === 'dark';
        return {
          c1: hexToRGB('FF9656'), c2: hexToRGB('F14575'), c3: hexToRGB('9270F4'),
          bg: dark ? hexToRGB('14111C') : hexToRGB('FBF7EF'),
          intensity: dark ? intensity * 1.15 : intensity,
        };
      }
      function frame(now) {
        var tnow = (typeof now === 'number') ? now : ((window.performance && performance.now) ? performance.now() : Date.now());
        mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
        var sy = (window.pageYOffset || 0) / Math.max(1, window.innerHeight);
        sc += (sy - sc) * 0.06;
        var pal = palette();
        gl.uniform2f(U.res, canvas.width, canvas.height);
        gl.uniform1f(U.time, (tnow - start) / 1000);
        gl.uniform2f(U.mouse, mx, my);
        gl.uniform1f(U.scroll, sc);
        gl.uniform1f(U.intensity, pal.intensity);
        gl.uniform3fv(U.c1, pal.c1); gl.uniform3fv(U.c2, pal.c2); gl.uniform3fv(U.c3, pal.c3);
        gl.uniform3fv(U.bg, pal.bg);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        self._raf = requestAnimationFrame(frame);
      }
      self._raf = requestAnimationFrame(frame);
      requestAnimationFrame(function () { canvas.style.opacity = '1'; });  // fade in
      // Pause rendering while the tab is hidden — no point burning the GPU
      // (and the phone's battery) on a background you can't see.
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) { if (self._raf) { cancelAnimationFrame(self._raf); self._raf = null; } }
        else if (!self._raf) { self._raf = requestAnimationFrame(frame); }
      });
      return true;
    },
    stop: function () { if (this._raf) cancelAnimationFrame(this._raf); this._raf = null; }
  };

  window.SyedAurora = SyedAurora;
})();
