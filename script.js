// Avowed - simple top-down shooter
// Controls: WASD or arrows to move. Click to shoot or press Space.
// Three file setup: index.html, style.css, script.js

(() => {
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
  
    // UI
    const scoreEl = document.getElementById('score');
    const hpEl = document.getElementById('hp');
    const waveEl = document.getElementById('wave');
    const startBtn = document.getElementById('startBtn');
    const restartBtn = document.getElementById('restartBtn');
    const overlay = document.getElementById('overlay');
    const ovTitle = document.getElementById('ovTitle');
    const ovScore = document.getElementById('ovScore');
    const ovRestart = document.getElementById('ovRestart');
  
    const W = canvas.width, H = canvas.height;
  
    // Game state
    let running = false;
    let keys = {};
    let mouse = {x: W/2, y: H/2, down:false};
    let player, bullets, enemies, particles;
    let lastTime = 0;
    let score = 0;
    let wave = 0;
    let spawnTimer = 0;
  
    // Utilities
    function rand(min, max){ return Math.random()*(max-min)+min; }
    function dist(a,b){ const dx=a.x-b.x, dy=a.y-b.y; return Math.sqrt(dx*dx+dy*dy); }
  
    // Entities
    function createPlayer(){
      return {
        x: W/2, y: H/2, r: 16, speed: 220, hp: 100, fireRate: 0.2, fireCooldown:0
      };
    }
  
    function spawnEnemy(type='basic'){
      const edge = Math.floor(rand(0,4));
      let x,y;
      if(edge===0){ x = -30; y = rand(0,H); }
      else if(edge===1){ x = W+30; y = rand(0,H); }
      else if(edge===2){ x = rand(0,W); y = -30; }
      else { x = rand(0,W); y = H+30; }
      const speed = type==='fast' ? rand(100,160) : rand(45,90);
      const hp = type==='tank' ? 40 : (type==='fast'?8:18);
      const color = type==='fast' ? '#ff2f2fff' : (type==='tank' ? '#ff2f2fff' : '#ff2f2fff');
      return {x,y,r: type==='tank'?26: (type==='fast'?10:14), speed, hp, type, color};
    }
  
    function shoot(x,y){
      const angle = Math.atan2(y - player.y, x - player.x);
      const speed = 500;
      bullets.push({x:player.x + Math.cos(angle)*player.r, y:player.y + Math.sin(angle)*player.r, vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed, r:4, life:1.6});
    }
  
    // Particles for effects
    function spawnParticles(x,y,color,amount=10){
      for(let i=0;i<amount;i++){
        const a = rand(0, Math.PI*2);
        const s = rand(30, 260);
        particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life: rand(0.5,1.2),r: rand(1,3), color});
      }
    }
  
    // Game loop
    function init(){
      player = createPlayer();
      bullets = [];
      enemies = [];
      particles = [];
      score = 0;
      wave = 0;
      spawnTimer = 0;
      lastTime = performance.now();
      updateUI();
      overlay.classList.add('hidden');
      restartBtn.style.display = 'none';
      running = true;
      requestAnimationFrame(loop);
    }
  
    function endGame(){
      running = false;
      ovTitle.textContent = 'Game Over';
      ovScore.textContent = score;
      overlay.classList.remove('hidden');
      restartBtn.style.display = 'inline-block';
    }
  
    function nextWave(){
      wave++;
      waveEl.textContent = wave;
      const enemyCount = Math.min(20, 4 + Math.floor(wave*1.6));
      // spawn a few immediately
      for(let i=0;i<enemyCount;i++){
        let t = 'basic';
        if(Math.random() < Math.min(0.25, wave*0.02)) t='fast';
        if(Math.random() < Math.min(0.12, wave*0.01)) t='tank';
        enemies.push(spawnEnemy(t));
      }
    }
  
    function updateUI(){
      scoreEl.textContent = score;
      hpEl.textContent = Math.max(0, Math.round(player.hp));
      waveEl.textContent = wave;
    }
  
    function loop(ts){
      if(!running) return;
      const dt = Math.min(0.033, (ts - lastTime)/1000); // cap dt to avoid big jumps
      lastTime = ts;
  
      // Input: movement
      let dx=0, dy=0;
      if(keys['ArrowLeft']||keys['a']) dx -= 1;
      if(keys['ArrowRight']||keys['d']) dx += 1;
      if(keys['ArrowUp']||keys['w']) dy -= 1;
      if(keys['ArrowDown']||keys['s']) dy += 1;
      if(dx!==0 || dy!==0){
        const len = Math.sqrt(dx*dx + dy*dy);
        dx/=len; dy/=len;
        player.x += dx * player.speed * dt;
        player.y += dy * player.speed * dt;
        // keep inside
        player.x = Math.max(player.r, Math.min(W-player.r, player.x));
        player.y = Math.max(player.r, Math.min(H-player.r, player.y));
      }
  
      // Shooting
      player.fireCooldown -= dt;
      if((mouse.down || keys[' ']) && player.fireCooldown <= 0){
        shoot(mouse.x, mouse.y);
        player.fireCooldown = player.fireRate;
        spawnParticles(player.x + (mouse.x-player.x)*0.15, player.y + (mouse.y-player.y)*0.15, '#cfefff', 6);
      }
  
      // Update bullets
      for(let i=bullets.length-1;i>=0;i--){
        const b = bullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
        if(b.life <= 0 || b.x < -20 || b.x > W+20 || b.y < -20 || b.y > H+20) bullets.splice(i,1);
      }
  
      // Spawn waves/periodic enemies
      spawnTimer += dt;
      if(spawnTimer > Math.max(1.0, 3 - wave*0.08)){
        spawnTimer = 0;
        // chance to spawn one enemy mid-wave
        let t = Math.random() < 0.15 ? 'fast' : 'basic';
        if(Math.random() < 0.06) t = 'tank';
        enemies.push(spawnEnemy(t));
      }
      // When no more enemies, start next wave
      if(enemies.length === 0){
        nextWave();
      }
  
      // Update enemies
      for(let i=enemies.length-1;i>=0;i--){
        const e = enemies[i];
        // move toward player
        const ang = Math.atan2(player.y - e.y, player.x - e.x);
        e.x += Math.cos(ang) * e.speed * dt;
        e.y += Math.sin(ang) * e.speed * dt;
  
        // collision with player
        if(dist(e, player) < e.r + player.r){
          // damage depends on type
          const dmg = e.type==='fast'?6: (e.type==='tank'?16:10);
          player.hp -= dmg * dt * 4; // continuous contact damage
          spawnParticles(e.x, e.y, '#ffb3b3', 2);
          if(player.hp <= 0){
            player.hp = 0;
            updateUI();
            endGame();
            return;
          }
        }
  
        // check bullets hit enemy
        for(let j=bullets.length-1;j>=0;j--){
          const b = bullets[j];
          if(Math.hypot(b.x - e.x, b.y - e.y) < b.r + e.r){
            // hit
            e.hp -= 10;
            bullets.splice(j,1);
            spawnParticles(b.x, b.y, e.color, 8);
            if(e.hp <= 0){
              // killed
              score += (e.type==='tank'?70 : (e.type==='fast'?18:30)) + Math.floor(wave*2);
              // small chance to drop health
              if(Math.random() < 0.08){
                player.hp = Math.min(100, player.hp + 8);
                spawnParticles(e.x, e.y, '#b8ffb0', 12);
              }
              enemies.splice(i,1);
              break;
            }
          }
        }
      }
  
      // Particles update
      for(let i=particles.length-1;i>=0;i--){
        const p = particles[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.98;
        p.vy *= 0.98;
        if(p.life <= 0) particles.splice(i,1);
      }
  
      // small passive score
      score += dt * 0.2;
  
      updateUI();
      draw();
      requestAnimationFrame(loop);
    }
  
    // Drawing
    function draw(){
      // clear
      ctx.clearRect(0,0,W,H);
  
      // subtle grid/background stars
      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = '#ffffff';
      for(let x=0;x< W; x+=40){
        for(let y=0;y< H; y+=40){
          ctx.fillRect(x+6,y+6,1,1);
        }
      }
      ctx.restore();
  
      // draw player shadow
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(player.x+4, player.y+10, player.r+6, player.r/2+6, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
  
      // draw player
      ctx.save();
      ctx.translate(player.x, player.y);
      const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
      ctx.rotate(angle);
      // body
      ctx.fillStyle = '#58b0ff';
      ctx.beginPath();
      ctx.moveTo(-14, -10);
      ctx.quadraticCurveTo(18, 0, -14, 10);
      ctx.closePath();
      ctx.fill();
      // cockpit
      ctx.fillStyle = '#022637';
      ctx.beginPath();
      ctx.ellipse(6,0,6,5,0,0,Math.PI*2);
      ctx.fill();
      ctx.restore();
  
      // draw bullets
      ctx.save();
      for(const b of bullets){
        ctx.beginPath();
        ctx.fillStyle = '#dff7ff';
        ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
  
      // draw enemies
      for(const e of enemies){
        ctx.save();
        ctx.translate(e.x, e.y);
        // shadow
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath();
        ctx.ellipse(3, 8, e.r+6, e.r/2+6, 0, 0, Math.PI*2);
        ctx.fill();
  
        // body
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(0, 0, e.r, 0, Math.PI*2);
        ctx.fill();
  
        // health bar
        const hbW = e.r*2;
        ctx.fillStyle = '#222';
        ctx.fillRect(-e.r, -e.r-8, hbW, 4);
        ctx.fillStyle = '#90ee90';
        const hperc = Math.max(0, e.hp) / (e.type==='tank'?40:(e.type==='fast'?8:18));
        ctx.fillRect(-e.r, -e.r-8, hbW * hperc, 4);
  
        ctx.restore();
      }
  
      // draw particles
      for(const p of particles){
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life/1.2);
        ctx.beginPath();
        ctx.fillStyle = p.color || '#fff';
        ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
      }
  
      // HUD crosshair
      ctx.save();
      ctx.translate(mouse.x, mouse.y);
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(-10,0); ctx.lineTo(10,0);
      ctx.moveTo(0,-10); ctx.lineTo(0,10);
      ctx.strokeStyle = '#aee6ff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  
    // Input handlers
    window.addEventListener('keydown', e => {
      keys[e.key] = true;
      // prevent space from scrolling
      if(e.key === ' ') e.preventDefault();
    });
    window.addEventListener('keyup', e => { keys[e.key] = false; });
  
    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      mouse.x = (e.clientX - rect.left) * scaleX;
      mouse.y = (e.clientY - rect.top) * scaleY;
    });
  
    canvas.addEventListener('mousedown', e => { mouse.down = true; });
    canvas.addEventListener('mouseup', e => { mouse.down = false; });
  
    // Buttons
    startBtn.addEventListener('click', () => {
      init();
      startBtn.style.display = 'none';
    });
    restartBtn.addEventListener('click', () => {
      init();
    });
    ovRestart.addEventListener('click', () => {
      init();
    });
  
    // Pause/resume on blur
    window.addEventListener('blur', () => { /* optional: pause */ });
  
    // small autoplay: show instructions, but do not start automatically
    // render initial scene
    player = createPlayer();
    bullets = []; enemies = []; particles = [];
    draw();
  
  })();
  