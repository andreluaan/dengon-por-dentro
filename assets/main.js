const $ = id => document.getElementById(id)
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const LINES = [
  'Recado recebido. Bora levar.',
  'Tô de olho na conversa "Você".',
  'Sem o código do Authenticator, nem escuto.',
  'Cuidado com o chip, hein.',
  'Áudio até 5 minutos, combinado?',
  'Se o nome vier errado, a culpa é do Whisper.',
  'Dois a três segundos entre mensagens. Calma.',
  'Em C:\\TRABALHO eu pergunto antes.',
]
const POSES = ['frente', 'ouvindo', 'entregando', 'tres-quartos']
const FOCUS = { 1: 'phone', 2: 'phone', 3: 'pc', 4: 'pc', 5: 'phone' }
const TITLES = ['Dengon · esperando', 'Dengon · conferindo', 'Dengon · Financeiro', 'Dengon · Financeiro', 'Dengon · Financeiro · enviado']
// What happens on screen in each step, in order: chat messages, log lines, the letter's flights and the report.
const SCRIPT = {
  1: ['msg'],
  2: ['msg', 'msg', 'msg'],
  3: ['fly-up', 'log', 'log', 'msg'],
  4: ['msg', 'log', 'log', 'pdf', 'log'],
  5: ['log', 'stamp', 'fly-down', 'msg', 'msg'],
}
// Each ready-made phrase as it plays in the chat: Dengon's face, then the messages in order. Replies are the service's own texts.
const COMMANDS = [
  ['feliz', ['me', 'bom dia dengon'], ['dengon', 'Bom dia, André! Conversa nova aberta. O que manda?']],
  ['atento', ['me', 'mudar de assunto'], ['dengon', 'Beleza. Do que vamos falar agora?']],
  ['satisfeito', ['me', 'limpar conversa'], ['dengon', 'Conversa salva no app do PC. Conversa limpa em Design-system.']],
  ['pensando', ['me', 'status'], ['dengon', '📁 Design-system · sessão 3f9c2a1b · Windows, branch main']],
  ['pensando', ['me', 'andamento'], ['dengon', 'Faz 1 min 20 s que estou em Design-system.\n• Lendo tokens.css\n• Editando button.css']],
  ['satisfeito', ['me', 'cancelar'], ['dengon', 'Tarefa cancelada.']],
  ['atento', ['dengon', 'Quero editar o arquivo contrato.docx.\n\nPosso? Responde sim ou não.'], ['me', 'sim']],
]
// What Dengon checks at each security layer, and where the letter stops on its way down.
const GUARD = [
  ['atento', 'Só leio a conversa "Você". Contato e grupo eu nem abro.', -118],
  ['pensando', 'Agora o código do Authenticator. Sem ele, nada passa daqui.', -40],
  ['atento', 'Em C:\\TRABALHO, cada ação espera o seu sim.', 40],
  ['satisfeito', 'Ritmo calmo: até 400 mensagens por dia.', 118],
  ['feliz', 'Tudo certo. Agora o pedido chega ao Claude.', 180],
]
let lineIndex = 0
let lastTouch = Date.now()
let sceneRun = 0

const store = {
  get() { try { return localStorage.getItem('tema') } catch { return null } },
  set(value) { try { localStorage.setItem('tema', value) } catch {} },
}

function currentTheme() {
  return document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
}

function paintThemeLabel() {
  $('theme-label').textContent = currentTheme() === 'dark' ? 'Tema claro' : 'Tema escuro'
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  store.set(theme)
  paintThemeLabel()
}

function toggleTheme(event) {
  const next = currentTheme() === 'dark' ? 'light' : 'dark'
  const root = document.documentElement.style
  root.setProperty('--fx', `${event.clientX}px`)
  root.setProperty('--fy', `${event.clientY}px`)
  if (document.startViewTransition && !reduced) document.startViewTransition(() => applyTheme(next))
  else applyTheme(next)
  say(next === 'dark' ? 'Tinta branca no papel preto.' : 'Papel claro de novo.')
}

function say(text) {
  const box = $('say')
  box.textContent = text
  box.classList.remove('pop-in')
  void box.offsetWidth
  box.classList.add('pop-in')
}

function wake() {
  lastTouch = Date.now()
  $('char').classList.remove('sleep')
}

function poke() {
  wake()
  const char = $('char')
  char.classList.remove('hop')
  void char.offsetWidth
  char.classList.add('hop')
  const pose = $('pose')
  pose.src = `assets/dengon/${POSES[(lineIndex + 1) % POSES.length]}.webp`
  pose.classList.remove('swap')
  void pose.offsetWidth
  pose.classList.add('swap')
  say(LINES[lineIndex++ % LINES.length])
}

// He leans a little toward the pointer, the way the old drawing followed it with the eyes.
function trackPointer(event) {
  const rect = $('char').getBoundingClientRect()
  const x = event.clientX - (rect.left + rect.width / 2)
  const y = event.clientY - (rect.top + rect.height / 2)
  const reach = Math.max(-1, Math.min(1, x / 500))
  document.querySelector('.boil').style.setProperty('--lean', `${(reach * 4).toFixed(2)}deg`)
  if (Math.hypot(x, y) < 320) wake()
}

// Swapping between three displacement maps gives the ink the hand-drawn boil of the portfolio.
function startBoil() {
  const body = document.querySelector('.boil')
  let frame = 0
  setInterval(() => {
    if (document.hidden || scrollY > innerHeight) return
    frame = (frame + 1) % 3
    body.style.filter = `url(#boil${frame})`
  }, 170)
}

function startSleep() {
  setInterval(() => {
    if (document.hidden || Date.now() - lastTouch < 30000) return
    const char = $('char')
    if (!char.classList.contains('sleep')) {
      char.classList.add('sleep')
      say('Tô aqui, só descansando.')
    }
    const z = document.createElement('span')
    z.className = 'z'
    z.textContent = 'z'
    char.parentElement.append(z)
    setTimeout(() => z.remove(), 2400)
  }, 1700)
}

// Layers nearer the viewer move more, with both the scroll and the pointer.
function startParallax() {
  const layers = [...document.querySelectorAll('[data-speed], [data-drift]')].map(el => ({
    el,
    speed: Number(el.dataset.speed ?? 0),
    drift: Number(el.dataset.drift ?? 0),
  }))
  let px = 0
  let py = 0
  let queued = false
  const paint = () => {
    queued = false
    if (scrollY > innerHeight * 1.2) return
    for (const { el, speed, drift } of layers) {
      el.style.transform = `translate3d(${(px * drift).toFixed(1)}px, ${(scrollY * speed + py * drift * .4).toFixed(1)}px, 0)`
    }
  }
  const queue = () => {
    if (!queued) requestAnimationFrame(paint)
    queued = true
  }
  addEventListener('scroll', queue, { passive: true })
  addEventListener('pointermove', event => {
    px = event.clientX / innerWidth - .5
    py = event.clientY / innerHeight - .5
    queue()
  }, { passive: true })
}

function tilt(el, strength) {
  el.addEventListener('pointermove', event => {
    const rect = el.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - .5
    const y = (event.clientY - rect.top) / rect.height - .5
    el.style.setProperty('--ry', `${(x * strength).toFixed(2)}deg`)
    el.style.setProperty('--rx', `${(-y * strength).toFixed(2)}deg`)
  })
  el.addEventListener('pointerleave', () => {
    el.style.setProperty('--ry', '0deg')
    el.style.setProperty('--rx', '0deg')
  })
}

const pause = ms => new Promise(resolve => setTimeout(resolve, ms))

function placeWalker(progress) {
  const at = `${(4 + progress * 92).toFixed(2)}%`
  $('walker').style.left = at
  document.querySelector('.progress').style.setProperty('--p', at)
}

function reveal(msg, run) {
  msg.classList.remove('quiet')
  msg.classList.add('show')
  setTimeout(() => { if (run === sceneRun) msg.classList.add('read') }, 700)
}

async function typeOut(msg, run) {
  const field = $('field')
  const text = msg.textContent
  field.classList.add('typing')
  for (let i = 1; i <= text.length; i += 1) {
    if (run !== sceneRun) return
    $('typed').textContent = text.slice(0, i)
    await pause(text.length > 12 ? 26 : 95)
  }
  await pause(200)
  $('send').classList.add('press')
  await pause(160)
  $('send').classList.remove('press')
  $('typed').textContent = ''
  field.classList.remove('typing')
}

// The letter leaves one screen, arcs over the gap and lands on the other.
function fly(from, to) {
  if (!window.gsap) return pause(0)
  const box = $('devices').getBoundingClientRect()
  const a = from.getBoundingClientRect()
  const b = to.getBoundingClientRect()
  const start = [a.left - box.left + a.width / 2 - 20, a.top - box.top + a.height * .6]
  const end = [b.left - box.left + b.width / 2 - 20, b.top - box.top + b.height * .4]
  const top = Math.min(start[1], end[1]) - 80
  return gsap.timeline()
    .set('#envelope', { x: start[0], y: start[1], rotation: -10, scale: .5, opacity: 0 })
    .to('#envelope', { opacity: 1, scale: 1, duration: .2, ease: 'power2.out' })
    .to('#envelope', { keyframes: { x: [start[0], (start[0] + end[0]) / 2, end[0]], y: [start[1], top, end[1]], rotation: [-10, 6, 0], easeEach: 'sine.inOut' }, duration: .9 })
    .to('#envelope', { opacity: 0, scale: .4, duration: .2, ease: 'power2.in' })
    .then()
}

// Earlier steps are drawn finished at once; only the step just reached plays, and only when scrolling down.
async function playStep(step, forward, fresh = false) {
  const run = ++sceneRun
  const animate = forward && !reduced
  const settled = at => at < step || (at === step && !animate && !fresh)
  const devices = $('devices')
  devices.dataset.step = step
  devices.dataset.focus = FOCUS[step]
  $('win-title').textContent = TITLES[step - 1]
  document.querySelectorAll('.beat').forEach(beat => beat.classList.toggle('active', Number(beat.dataset.step) === step))
  document.querySelectorAll('.stops i').forEach((dot, i) => {
    dot.classList.toggle('done', i < step)
    dot.classList.toggle('now', i === step - 1)
  })
  const msgs = [...document.querySelectorAll('.msg')]
  const lines = [...document.querySelectorAll('.log li')]
  for (const msg of msgs) {
    const done = settled(Number(msg.dataset.at))
    msg.classList.toggle('show', done)
    msg.classList.toggle('read', done)
    msg.classList.add('quiet')
  }
  for (const line of lines) {
    line.classList.toggle('on', settled(Number(line.dataset.at)))
    line.classList.remove('busy')
  }
  $('pdf').classList.toggle('on', step === 5 || (step === 4 && settled(4)))
  $('pdf').classList.toggle('done', step === 5 && settled(5))
  $('typed').textContent = ''
  $('field').classList.remove('typing')
  if (!animate) return

  const queue = { msg: msgs.filter(m => Number(m.dataset.at) === step), log: lines.filter(l => Number(l.dataset.at) === step) }
  const phone = document.querySelector('.phone')
  const screen = document.querySelector('.screen')
  for (const action of SCRIPT[step]) {
    if (run !== sceneRun) return
    if (action === 'msg') {
      const msg = queue.msg.shift()
      if (msg.hasAttribute('data-typed')) await typeOut(msg, run)
      else await pause(450)
      if (run !== sceneRun) return
      reveal(msg, run)
      await pause(380)
    } else if (action === 'log') {
      const line = queue.log.shift()
      line.classList.add('on', 'busy')
      await pause(520)
      line.classList.remove('busy')
    } else if (action === 'pdf') {
      $('pdf').classList.add('on')
      await pause(300)
    } else if (action === 'stamp') {
      $('pdf').classList.add('done')
      await pause(350)
    } else {
      await fly(action === 'fly-up' ? phone : screen, action === 'fly-up' ? screen : phone)
    }
  }
}

function watchJourney() {
  const beats = [...document.querySelectorAll('.beat')]
  playStep(1, false, true)
  placeWalker(0)
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger)
    const triggers = beats.map(beat => ScrollTrigger.create({
      trigger: beat, start: 'top 55%', end: 'bottom 55%',
      onToggle: self => { if (self.isActive) playStep(Number(beat.dataset.step), self.direction === 1) },
    }))
    // After every layout recalculation, redraw the step the reader is actually on, without replaying it.
    ScrollTrigger.addEventListener('refresh', () => {
      const passed = triggers.filter(trigger => trigger.progress > 0).length
      playStep(Math.max(1, passed), false, passed === 0)
    })
    addEventListener('load', () => ScrollTrigger.refresh())
    // The rail and the runner follow the scrollbar itself, not the steps.
    const walker = $('walker')
    const rail = { p: 0 }
    let rest
    gsap.to(rail, {
      p: 1, ease: 'none', onUpdate: () => placeWalker(rail.p),
      scrollTrigger: {
        trigger: beats[0], start: 'top 55%', endTrigger: beats.at(-1), end: 'top 55%', scrub: reduced ? true : .6,
        onUpdate: self => {
          walker.classList.toggle('left', self.direction < 0)
          if (reduced) return
          walker.classList.add('walking')
          clearTimeout(rest)
          rest = setTimeout(() => walker.classList.remove('walking'), 180)
        },
      },
    })
    return
  }
  document.documentElement.classList.add('no-gsap')
  let current = 1
  const seen = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      const step = Number(entry.target.dataset.step)
      $('walker').classList.toggle('left', step < current)
      playStep(step, step > current)
      placeWalker((step - 1) / 4)
      current = step
    }
  }, { rootMargin: '-45% 0px -45% 0px' })
  beats.forEach(beat => seen.observe(beat))
}

function watchReveals() {
  const seen = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      entry.target.classList.add('seen')
      seen.unobserve(entry.target)
    }
  }, { threshold: .15 })
  document.querySelectorAll('.rise').forEach(el => seen.observe(el))
}

function nod(img) {
  img.classList.remove('nod')
  void img.offsetWidth
  img.classList.add('nod')
}

function bubble(who, text) {
  const p = document.createElement('p')
  p.className = `bubble ${who}`
  if (who === 'dengon') p.append(Object.assign(document.createElement('b'), { textContent: 'Dengon' }))
  p.append(text)
  return p
}

// Plays only while the chat is on screen and until the reader picks a phrase.
function watchCommands() {
  const buttons = [...document.querySelectorAll('.cmd')]
  const thread = $('cmd-thread')
  const face = $('cmd-face')
  let run = 0
  let current = 0
  let auto = true
  let visible = false
  const play = async index => {
    const mine = ++run
    current = index
    buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)))
    const [mood, ...flow] = COMMANDS[index]
    face.src = `assets/dengon/${mood}.webp`
    thread.replaceChildren()
    for (const [who, text] of flow) {
      if (!reduced && who === 'dengon') {
        const dots = Object.assign(document.createElement('p'), { className: 'bubble dengon typing' })
        dots.append(document.createElement('i'), document.createElement('i'), document.createElement('i'))
        thread.append(dots)
        await pause(750)
        if (mine !== run) return
        dots.remove()
        nod(face)
      } else if (!reduced) {
        await pause(250)
      }
      if (mine !== run) return
      thread.append(bubble(who, text))
      if (!reduced) await pause(400)
    }
  }
  buttons.forEach((button, i) => button.addEventListener('click', () => { auto = false; play(i) }))
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting }, { threshold: .4 }).observe($('cmd-thread'))
  if (!reduced) setInterval(() => { if (auto && visible && !document.hidden) play((current + 1) % COMMANDS.length) }, 5200)
}

function watchLayers() {
  const planes = [...document.querySelectorAll('.plane')]
  const items = [...document.querySelectorAll('.layers li')]
  const letter = $('letter')
  const face = $('guard-face')
  const words = document.querySelector('#guard-say span')
  let step = -1
  let held = false
  let visible = false
  const show = layer => {
    const [mood, text, y] = GUARD[layer]
    planes.forEach(plane => plane.classList.toggle('lit', Number(plane.dataset.layer) === layer))
    items.forEach(item => item.classList.toggle('lit', Number(item.dataset.layer) === layer))
    letter.style.setProperty('--y', `${y}px`)
    letter.style.setProperty('--o', layer === GUARD.length - 1 ? '0' : '1')
    if (!face.src.endsWith(`${mood}.webp`)) face.src = `assets/dengon/${mood}.webp`
    words.textContent = text
    nod(face)
  }
  const next = () => {
    step = (step + 1) % GUARD.length
    if (step === 0) {
      letter.style.transition = 'none'
      letter.style.setProperty('--y', '-180px')
      void letter.offsetWidth
      letter.style.transition = ''
    }
    show(step)
  }
  for (const item of items) {
    const layer = Number(item.dataset.layer)
    item.addEventListener('pointerenter', () => { held = true; show(layer) })
    item.addEventListener('pointerleave', () => { held = false })
    item.addEventListener('click', () => show(layer))
  }
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting }, { threshold: .3 }).observe($('stack'))
  show(0)
  step = 0
  if (!reduced) setInterval(() => { if (visible && !held && !document.hidden) next() }, 2000)
}

const saved = store.get()
if (saved === 'dark' || saved === 'light') document.documentElement.dataset.theme = saved
paintThemeLabel()
watchJourney()
watchReveals()
watchCommands()
watchLayers()
$('theme').addEventListener('click', toggleTheme)
$('char').addEventListener('click', poke)
addEventListener('pointermove', trackPointer, { passive: true })
if (!reduced) {
  startBoil()
  startSleep()
  startParallax()
  tilt($('devices'), 7)
  document.querySelectorAll('[data-tilt]').forEach(card => tilt(card, 10))
}
