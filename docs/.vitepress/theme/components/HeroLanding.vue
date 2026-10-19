<script setup lang="ts">
import { ref } from 'vue';
const copied=ref(false);
async function copyInstall(){try{await navigator.clipboard.writeText('npm install -g openwolf');copied.value=true;setTimeout(()=>copied.value=false,2000)}catch{copied.value=false}}
const contributors=['itdove','CochainComplex','davdittrich','CBenadieBHC','Noboxer','citizenshanegit','Jezzaw56','eram','aethyron','marrahi','alfasin','liveoakwag','pereirajo','lojasmm-jonathan','smasoftware','goashem','AdarshJ173','oiahoon','lshgdut','ChasLui','nottyjay','kantorcodes'];
</script>

<template>
  <main class="ow-home">
    <section class="intro" aria-labelledby="home-title">
      <p class="eyebrow">An open-source tool for AI-assisted coding</p>
      <h1 id="home-title">Keep your project notes.<br>Continue where you left off.</h1>
      <p class="lead">OpenWolf helps your coding assistant find the right files, keep useful notes and pick up saved work. You can review what it recorded in a local dashboard.</p>
      <div class="links"><a class="primary" href="/getting-started">Set up OpenWolf</a><a href="https://github.com/cytostack/openwolf">View the source ↗</a></div>
      <p class="release">Preparing version 2.5.3 · <a href="/release-2.5.3">See the changes and test results</a></p>
    </section>

    <section class="example" aria-label="Example project notes">
      <div><p class="eyebrow">A simple example</p><h2>Start a new session<br>with a useful next step.</h2><p>Your last session ended halfway through a change. Instead of explaining everything again, you can give your assistant a short saved note and let it check the current files.</p></div>
      <div class="note"><span class="note-label">Example only — not live project data</span><h3>Checkout form</h3><dl><dt>Task</dt><dd>Add an address field.</dd><dt>Completed</dt><dd>The form and validation are updated.</dd><dt>Next step</dt><dd>Test an order with an incomplete address.</dd><dt>Check first</dt><dd>The tests have not been run yet.</dd></dl></div>
    </section>

    <section class="section" aria-labelledby="helps-title">
      <p class="eyebrow">What it helps you do</p><h2 id="helps-title">Less searching. Clearer project history.</h2>
      <div class="feature-list">
        <article><span>01</span><div><h3>Find relevant files</h3><p>OpenWolf builds a searchable file index with short descriptions. Your assistant can use it to find a function or choose which part of a large file to read.</p></div></article>
        <article><span>02</span><div><h3>Keep useful notes</h3><p>Save the current task, decisions and known fixes in your project. Old session notes can be archived and restored. You can inspect the files yourself.</p></div></article>
        <article><span>03</span><div><h3>Reduce repeated information</h3><p>Supported integrations can warn about repeated file reads and shorten large command results. The full command output is kept locally when it is shortened.</p></div></article>
        <article><span>04</span><div><h3>Understand recorded usage</h3><p>The dashboard shows available token records, project activity and errors. Tokens are the units an AI model uses to process text. Price estimates are separate from your actual bill.</p></div></article>
      </div>
    </section>

    <section class="section split" aria-labelledby="setup-title">
      <div><p class="eyebrow">Getting started</p><h2 id="setup-title">Install it in your project.</h2><p>You need Node.js 20 or later and a supported coding assistant. Run these commands from your project's folder. Choose the assistant you use during setup.</p><a href="/getting-started">Read the setup guide →</a></div>
      <div class="commands"><div class="command-heading"><span>Terminal</span><button @click="copyInstall" :aria-label="copied ? 'Installation command copied' : 'Copy installation command'">{{copied?'Copied':'Copy install command'}}</button></div><pre><code>npm install -g openwolf
openwolf init
openwolf dashboard</code></pre><p>The install command downloads the latest published release. Version 2.5.3 is still being prepared.</p></div>
    </section>

    <section class="section" aria-labelledby="agents-title">
      <p class="eyebrow">Choose your assistant</p><h2 id="agents-title">Support depends on the integration.</h2>
      <div class="table-wrap"><table><thead><tr><th>Assistant</th><th>What to expect</th></tr></thead><tbody>
        <tr><td>Claude Code</td><td>Session context, file activity, command-output controls and available usage records.</td></tr>
        <tr><td>Codex</td><td>Supported session and shell hooks, saved-task recovery and available usage records.</td></tr>
        <tr><td>OpenCode</td><td>Plugin-based context, file activity and usage. Version 2.5.3 adds support for the OpenCode V2 plugin API.</td></tr>
        <tr><td>Other adapters</td><td>Some provide project instructions only. They do not all support the same hooks or reporting.</td></tr>
      </tbody></table></div><p class="small">Read the <a href="/hooks">integration guide</a> for the supported features and test limits.</p>
    </section>

    <section class="section split" aria-labelledby="local-title">
      <div><p class="eyebrow">Your project, on your machine</p><h2 id="local-title">Files you can inspect.<br>Settings you can change.</h2></div>
      <div class="prose"><p>OpenWolf stores project notes and local records in a <code>.wolf</code> folder. Its dashboard runs on your machine and requires a project access token.</p><p>OpenWolf does not make its own AI model calls. Your coding assistant still uses its configured provider. Optional update checks contact npm.</p><p>Missing usage data is shown as unavailable. Shorter command output does not prove a lower bill. Saved notes are evidence to review, not proof that a test passed.</p><p><a href="/configuration">Configuration</a> · <a href="/how-it-works">How it works</a> · <a href="/updating">Updates and backups</a></p></div>
    </section>

    <section class="section" aria-labelledby="release-title">
      <p class="eyebrow">Coming in 2.5.3</p><h2 id="release-title">Repairs to everyday use.</h2>
      <ul class="release-list"><li>More reliable background scanning and Windows command execution.</li><li>OpenCode V2 support, with checks for reads, edits and usage tracking.</li><li>Less repeated startup context and better handling of disabled projects.</li><li>Maintenance catch-up after sleep or restart, and safer project upgrades.</li><li>Clearer dashboard pages, with diagnostics kept separate from the overview.</li></ul>
      <p><a href="/release-2.5.3">Read the release record →</a></p>
    </section>

    <section class="section contributors" aria-labelledby="contributors-title">
      <p class="eyebrow">Built with community help</p><h2 id="contributors-title">Thank you to our contributors.</h2>
      <p>These people contributed code, reported problems, tested fixes or helped shape the work. Original authorship and contribution roles are recorded in the project.</p>
      <ul><li v-for="name in contributors" :key="name"><a :href="`https://github.com/${name}`">@{{name}}</a></li></ul>
      <a href="/contributors">See the full credits and contribution records →</a>
    </section>
    <footer><span>OpenWolf · Maintained by Cytostack</span><div><a href="https://github.com/cytostack/openwolf">GitHub</a><a href="/getting-started">Documentation</a><a href="https://github.com/cytostack/openwolf/blob/main/LICENSE">AGPL-3.0 licence</a></div></footer>
  </main>
</template>

<style scoped>
.ow-home{max-width:1120px;margin:0 auto;padding:0 32px;color:var(--vp-c-text-1);font-size:16px;line-height:1.7}
.ow-home a{color:var(--vp-c-brand-1);text-decoration:underline;text-underline-offset:4px}
.intro{padding:90px 0 64px;max-width:900px}.eyebrow{font-size:13px;font-weight:600;letter-spacing:.05em;color:var(--vp-c-text-2);margin:0 0 18px}
h1{font-size:clamp(36px,5.5vw,66px);line-height:1.12;letter-spacing:-.035em;font-weight:650;margin:0 0 24px}h2{font-size:clamp(26px,3vw,38px);line-height:1.2;letter-spacing:-.02em;font-weight:600;margin:0 0 22px}h3{font-size:20px;font-weight:600;margin:0 0 8px}.lead{font-size:20px;line-height:1.6;max-width:730px;color:var(--vp-c-text-2)}p{margin:0 0 18px}.links{display:flex;gap:28px;align-items:center;flex-wrap:wrap;margin:30px 0 22px}.links .primary{background:var(--vp-c-brand-1);color:var(--vp-c-bg);padding:11px 20px;border-radius:5px;text-decoration:none;font-weight:600}.release,.small{font-size:14px;color:var(--vp-c-text-2)}.section{padding:60px 0;border-top:1px solid var(--vp-c-divider)}.example,.split{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:start}.example{background:var(--vp-c-bg-alt);padding:36px;border:1px solid var(--vp-c-divider);border-radius:8px;margin-bottom:60px}.example p,.prose p,.feature-list p{color:var(--vp-c-text-2)}.note{background:var(--vp-c-bg);padding:26px;border:1px solid var(--vp-c-divider);border-radius:5px}.note-label{display:block;font-size:12px;color:var(--vp-c-text-2);margin-bottom:18px}.note dl{display:grid;grid-template-columns:100px 1fr;gap:12px;font-size:14px}.note dt{font-weight:600}.note dd{margin:0}.feature-list{display:grid;grid-template-columns:1fr 1fr;gap:30px 50px;margin-top:35px}.feature-list article{display:flex;gap:20px}.feature-list article>span{font-family:var(--vp-font-family-mono);color:var(--vp-c-text-2);font-size:13px;padding-top:4px}.commands{border:1px solid var(--vp-c-divider);border-radius:6px;overflow:hidden;background:var(--vp-c-bg-alt)}.command-heading{display:flex;justify-content:space-between;padding:12px 20px;border-bottom:1px solid var(--vp-c-divider);font-size:13px}.command-heading button{cursor:pointer;text-decoration:underline}.commands pre{font-size:15px;line-height:2;padding:20px;overflow:auto}.commands p{font-size:13px;padding:0 20px;color:var(--vp-c-text-2)}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:15px}th,td{text-align:left;padding:18px 12px;border-bottom:1px solid var(--vp-c-divider);vertical-align:top}th{font-weight:600}td:first-child{width:180px;font-weight:500}.small{margin-top:16px}.release-list{padding-left:20px;list-style:disc;margin:20px 0}.release-list li{margin:10px 0}.contributors>p{max-width:720px;color:var(--vp-c-text-2)}.contributors ul{display:flex;flex-wrap:wrap;gap:8px 22px;list-style:none;padding:0;margin:26px 0;font-size:14px}footer{border-top:1px solid var(--vp-c-divider);padding:26px 0 40px;display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;font-size:13px;color:var(--vp-c-text-2)}footer div{display:flex;gap:24px}a:focus-visible,button:focus-visible{outline:2px solid var(--vp-c-brand-1);outline-offset:5px}
@media(max-width:720px){.ow-home{padding:0 22px}.intro{padding-top:48px}.lead{font-size:18px}.example,.split,.feature-list{grid-template-columns:1fr;gap:26px}.example{padding:24px;margin-bottom:40px}.section{padding:38px 0}.note dl{grid-template-columns:85px 1fr}.links{gap:18px}td:first-child{width:110px}}
</style>
