<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

// Illustrative fields from the checkpoint API, not a live shell or provider response.
const scenes = [
  { title: '1 / 3 · Find the code', command: 'openwolf find validateAddress', lines: ['src/checkout.ts', '  function validateAddress · lines 18–42'], caption: 'The project index points to the relevant file and function.', state: 'Relevant code found' },
  { title: '2 / 3 · Save the next step', command: 'openwolf handoff checkpoint --agent codex --session demo --file checkpoint.json', lines: ['"objective": "Add an address field",', '"completed": ["Form updated"],', '"next_action": "Test an incomplete address"'], caption: 'The agent supplies checkpoint.json. OpenWolf saves its task notes.', state: 'Checkpoint saved · tests pending' },
  { title: '3 / 3 · Update as work progresses', command: 'openwolf handoff checkpoint --agent codex --session demo --file checkpoint.json', lines: ['"objective": "Add an address field",', '"completed": ["Form updated",', '  "Incomplete-address case checked"],', '"next_action": "Review the change"'], caption: 'After checking the code, the agent updates the file and saves the new next step.', state: 'Checkpoint updated · review next' },
];
const root = ref<HTMLElement | null>(null);
const index = ref(0);
const chars = ref(0);
const visibleLines = ref(0);
const paused = ref(false);
const reduced = ref(false);
const inView = ref(false);
const current = computed(() => scenes[index.value]);
const typed = computed(() => current.value.command.slice(0, chars.value));
const complete = computed(() => visibleLines.value >= current.value.lines.length);
let timer: ReturnType<typeof setTimeout> | undefined;
let observer: IntersectionObserver | undefined;
let motion: MediaQueryList | undefined;
let hold = 0;
function tick() {
  clearTimeout(timer);
  if (paused.value || reduced.value || !inView.value) return;
  if (chars.value < current.value.command.length) chars.value += 2;
  else if (visibleLines.value < current.value.lines.length) visibleLines.value++;
  else if (++hold >= 10) { select((index.value + 1) % scenes.length); return; }
  timer = setTimeout(tick, chars.value < current.value.command.length ? 28 : 400);
}
function select(next: number) {
  clearTimeout(timer); index.value = next; hold = 0;
  chars.value = reduced.value || paused.value ? current.value.command.length : 0;
  visibleLines.value = reduced.value || paused.value ? current.value.lines.length : 0;
  tick();
}
function toggle() { paused.value = !paused.value; if (paused.value) clearTimeout(timer); else tick(); }
function syncMotion() { reduced.value = motion?.matches ?? false; select(index.value); }
onMounted(() => {
  motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  syncMotion(); motion.addEventListener('change', syncMotion);
  observer = new IntersectionObserver(([entry]) => { inView.value = entry.isIntersecting; if (inView.value) tick(); else clearTimeout(timer); }, { threshold: 0.25 });
  if (root.value) observer.observe(root.value);
});
onBeforeUnmount(() => { clearTimeout(timer); observer?.disconnect(); motion?.removeEventListener('change', syncMotion); });
</script>

<template>
  <div ref="root" class="terminal-example">
    <div class="terminal-window" aria-label="Animated OpenWolf command example">
      <div class="terminal-bar"><span class="window-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>terminal</span><span class="scene-title">{{ current.title }}</span></div>
      <div class="terminal-body" aria-hidden="true">
        <div class="command"><span class="prompt">$</span><span>{{ typed }}<span v-if="chars < current.command.length" class="cursor">▍</span></span></div>
        <div class="response"><div v-for="(line, n) in current.lines" :key="`${index}-${n}`" :class="{ shown: n < visibleLines }">{{ line }}</div></div>
        <div class="result" :class="{ shown: complete }"><span>✓</span> {{ current.state }}</div>
      </div>
      <div class="sr-only">{{ current.command }}. {{ current.lines.join(' ') }}. {{ current.state }}.</div>
      <div class="terminal-caption">{{ current.caption }}</div>
    </div>
    <div class="demo-controls">
      <div class="steps" aria-label="Example steps"><button v-for="(scene,n) in scenes" :key="scene.title" :aria-label="scene.title" :aria-pressed="index===n" @click="select(n)">{{ n+1 }}</button></div>
      <span>Illustrative demo · output shortened</span>
      <button v-if="!reduced" class="pause" @click="toggle">{{ paused ? 'Play' : 'Pause' }}</button>
    </div>
  </div>
</template>

<style scoped>
.terminal-example{min-width:0;width:100%}.terminal-window{background:#191c24;color:#e5e7eb;border:1px solid #292e39;border-radius:15px;box-shadow:0 22px 38px -22px #151b2b80;overflow:hidden;font-family:var(--vp-font-family-mono);font-size:12px;line-height:1.8}.terminal-bar{display:flex;align-items:center;gap:16px;padding:15px 17px;border-bottom:1px solid #2b303b;color:#a9b0be;font-size:10px}.window-dots{display:flex;gap:7px}.window-dots i{display:block;width:9px;height:9px;border-radius:50%;background:#ff5f57}.window-dots i:nth-child(2){background:#febc2e}.window-dots i:nth-child(3){background:#28c840}.scene-title{margin-left:auto}.terminal-body{padding:24px 20px 20px;min-height:270px}.command{display:flex;align-items:flex-start;gap:9px;min-height:66px;white-space:pre-wrap;overflow-wrap:anywhere}.prompt,.cursor{color:#42d9ae}.response{color:#b9c2d2;min-height:104px;white-space:pre-wrap;overflow-wrap:anywhere}.response>div,.result{opacity:0;transform:translateY(4px);transition:opacity .25s ease,transform .25s ease}.response>.shown,.result.shown{opacity:1;transform:translateY(0)}.result{margin-top:12px;color:#eef3f7;font-size:11px}.result>span{color:#42d9ae;margin-right:4px}.terminal-caption{min-height:70px;padding:13px 20px;border-top:1px solid #2b303b;color:#a9b0be;font-family:var(--vp-font-family-base);font-size:12px;line-height:1.6}.demo-controls{display:flex;gap:12px;align-items:center;margin-top:16px;color:var(--vp-c-text-2);font-size:11px;flex-wrap:wrap}.steps{display:flex;gap:5px}.steps button,.pause{cursor:pointer;min-height:36px;min-width:36px;border:1px solid var(--vp-c-divider);border-radius:5px;color:var(--vp-c-text-2)}.steps button[aria-pressed=true]{color:var(--vp-c-bg);background:var(--vp-c-brand-1);border-color:var(--vp-c-brand-1)}.pause{margin-left:auto;padding:0 10px}button:focus-visible{outline:2px solid var(--vp-c-brand-1);outline-offset:3px}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
@media(max-width:720px){.terminal-body{min-height:365px}.response{min-height:180px}.terminal-caption{min-height:96px}.steps button,.pause{min-height:44px;min-width:44px}.demo-controls>span{order:3;flex-basis:100%}.scene-title{font-size:9px}.terminal-bar{gap:10px}}
@media(prefers-reduced-motion:reduce){.response>div,.result{transition:none}}
</style>
