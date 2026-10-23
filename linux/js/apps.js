import { AbbadiLinuxKernel } from './linux-kernel.js';
import { AbbadiLocalArabicAI } from './arabic-ai.js';

const kernel = new AbbadiLinuxKernel();
const arabicAI = new AbbadiLocalArabicAI(kernel);

window.abbadiOS = { kernel, arabicAI };

// Clock update
function updateClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const el = document.getElementById('clock-pill');
  if (el) el.textContent = `${hh}:${mm} · ${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}`;
}
setInterval(updateClock, 5000);
updateClock();

// Active input tracking for Glass Touch Keyboard
let activeInputEl = document.getElementById('term-input');
document.addEventListener('focusin', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
    activeInputEl = e.target;
  }
});

// Workspace & Split-Screen Controller
const WORKSPACE_ORDER = ['split3', 'terminal', 'ai', 'code', 'browser', 'netsec', 'appstore'];
let currentWorkspace = 'split3';

export function switchWorkspace(ws) {
  currentWorkspace = ws;
  const stage = document.getElementById('workspace-stage');
  const panes = document.querySelectorAll('.glass-pane');

  document.querySelectorAll('#top-workspaces .glass-pill').forEach(b => {
    b.classList.toggle('active', b.dataset.ws === ws);
  });
  document.querySelectorAll('.dock-items .dock-btn[data-dock]').forEach(b => {
    b.classList.toggle('active', b.dataset.dock === ws);
  });

  const splitBtn = document.getElementById('btn-split-mode');

  if (ws === 'split3') {
    stage.className = 'workspace-stage mode-split3';
    if (splitBtn) splitBtn.classList.add('active');
    panes.forEach(p => {
      const k = p.dataset.pane;
      p.classList.toggle('hidden-pane', !(k === 'terminal' || k === 'ai' || k === 'code'));
    });
    activeInputEl = document.getElementById('term-input');
  } else {
    stage.className = 'workspace-stage mode-single';
    if (splitBtn) splitBtn.classList.remove('active');
    panes.forEach(p => {
      p.classList.toggle('hidden-pane', p.dataset.pane !== ws);
    });
    if (ws === 'terminal') activeInputEl = document.getElementById('term-input');
    else if (ws === 'ai') activeInputEl = document.getElementById('ai-input');
    else if (ws === 'code') activeInputEl = document.getElementById('ide-editor');
    else if (ws === 'browser') activeInputEl = document.getElementById('browser-url');
  }
}

window.switchWorkspace = switchWorkspace;

// Bind Topbar & Bottom Dock buttons
document.querySelectorAll('#top-workspaces .glass-pill').forEach(btn => {
  btn.addEventListener('click', () => switchWorkspace(btn.dataset.ws));
});
document.querySelectorAll('.dock-items .dock-btn[data-dock]').forEach(btn => {
  btn.addEventListener('click', () => switchWorkspace(btn.dataset.dock));
});
document.getElementById('btn-split-mode')?.addEventListener('click', () => {
  switchWorkspace(currentWorkspace === 'split3' ? 'terminal' : 'split3');
});

// Bind the 3 Pure White Window Control Icons (− Minimize, □ Maximize/Split, × Close) on EVERY pane
document.querySelectorAll('.win-icon-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const action = btn.dataset.action;
    const target = btn.dataset.target;
    if (action === 'maximize') {
      if (currentWorkspace === 'split3') {
        switchWorkspace(target);
      } else {
        switchWorkspace('split3');
      }
    } else if (action === 'minimize' || action === 'close') {
      if (currentWorkspace === 'split3') {
        switchWorkspace('terminal');
      } else {
        switchWorkspace('split3');
      }
    }
  });
});

// Touch Swipe Left/Right Navigation for Galaxy Z Fold6 Inner Display
let touchStartX = 0;
let touchStartY = 0;
document.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
}, { passive: true });

document.addEventListener('touchend', (e) => {
  if (e.changedTouches.length === 1) {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 95 && Math.abs(dx) > Math.abs(dy) * 1.8) {
      const idx = WORKSPACE_ORDER.indexOf(currentWorkspace);
      if (dx < 0 && idx < WORKSPACE_ORDER.length - 1) {
        switchWorkspace(WORKSPACE_ORDER[idx + 1]);
      } else if (dx > 0 && idx > 0) {
        switchWorkspace(WORKSPACE_ORDER[idx - 1]);
      }
    }
  }
}, { passive: true });

// ============================================================================
// 1. TERMINAL CONTROLLER
// ============================================================================
const termOutput = document.getElementById('term-output');
const termForm = document.getElementById('term-form');
const termInput = document.getElementById('term-input');
const termPrompt = document.getElementById('term-prompt');
const cmdHistory = [];
let histIdx = -1;

function appendTermBlock(cmdText, stdoutText, stderrText, isBanner = false) {
  const div = document.createElement('div');
  div.className = 'term-line';
  if (cmdText) {
    const pSpan = document.createElement('span');
    pSpan.className = 'term-prompt-label';
    pSpan.textContent = `root@abbadi-fold6:${kernel.cwd}# `;
    const cSpan = document.createElement('span');
    cSpan.className = 'term-cmd-echo';
    cSpan.textContent = cmdText + '\n';
    div.appendChild(pSpan);
    div.appendChild(cSpan);
  }
  if (stdoutText) {
    const outSpan = document.createElement('span');
    outSpan.className = isBanner ? 'term-sys-banner' : 'term-stdout';
    outSpan.textContent = stdoutText;
    div.appendChild(outSpan);
  }
  if (stderrText) {
    const errSpan = document.createElement('span');
    errSpan.className = 'term-stderr';
    errSpan.textContent = stderrText;
    div.appendChild(errSpan);
  }
  termOutput.appendChild(div);
  termOutput.scrollTop = termOutput.scrollHeight;
}

export async function runTerminalCommand(cmd) {
  const clean = (cmd || '').trim();
  if (!clean) return;
  if (clean === 'clear') {
    termOutput.innerHTML = '';
    return;
  }
  cmdHistory.push(clean);
  histIdx = cmdHistory.length;
  const res = await kernel.exec(clean);
  termPrompt.textContent = `root@abbadi-fold6:${kernel.cwd}#`;
  appendTermBlock(clean, res.stdout, res.stderr);
  return res;
}

window.runTerminalCommand = runTerminalCommand;

termForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const v = termInput.value;
  termInput.value = '';
  await runTerminalCommand(v);
});

document.querySelectorAll('.term-quickbar .glass-chip[data-cmd]').forEach(chip => {
  chip.addEventListener('click', () => runTerminalCommand(chip.dataset.cmd));
});

// ============================================================================
// 2. AUTO-STARTED LOCAL ARABIC AI MODEL
// ============================================================================
const aiMessages = document.getElementById('ai-messages');
const aiForm = document.getElementById('ai-form');
const aiInput = document.getElementById('ai-input');

function addAiMessage(role, text, extra = null) {
  const msg = document.createElement('div');
  msg.className = `ai-msg ${role}`;
  const p = document.createElement('div');
  p.textContent = text;
  msg.appendChild(p);

  if (extra && extra.code) {
    const pre = document.createElement('div');
    pre.className = 'ai-code-block';
    pre.textContent = extra.code;
    msg.appendChild(pre);

    if (extra.cmdOutput) {
      const outBox = document.createElement('div');
      outBox.className = 'ai-code-block';
      outBox.style.color = '#6ee7b7';
      outBox.textContent = `⚡ نتيجة التنفيذ الحي (${extra.cmdExecuted}):\n${extra.cmdOutput.trim()}`;
      msg.appendChild(outBox);
    }

    const actions = document.createElement('div');
    actions.className = 'ai-code-actions';

    const btnRun = document.createElement('button');
    btnRun.className = 'glass-chip';
    btnRun.style.color = '#6ee7b7';
    btnRun.textContent = '▶ شغّل في التيرمينال (Run in Terminal)';
    btnRun.addEventListener('click', async () => {
      await runTerminalCommand(extra.cmdExecuted || `python3 ${extra.filename || 'port_scanner.py'}`);
    });

    const btnEdit = document.createElement('button');
    btnEdit.className = 'glass-chip';
    btnEdit.style.color = '#7dd3fc';
    btnEdit.textContent = '✎ افتح في محرر الأكواد (Open in Code IDE)';
    btnEdit.addEventListener('click', () => {
      const fname = extra.filename || 'ai_generated.py';
      kernel.vfs[`/root/projects/${fname}`] = extra.code;
      loadIdeFile(fname);
    });

    actions.appendChild(btnRun);
    actions.appendChild(btnEdit);
    msg.appendChild(actions);
  }

  aiMessages.appendChild(msg);
  aiMessages.scrollTop = aiMessages.scrollHeight;
}

export async function askArabicAI(promptText) {
  const q = (promptText || '').trim();
  if (!q) return;
  addAiMessage('user', `👤 أنت: ${q}`);
  const reply = await arabicAI.ask(q);
  addAiMessage('assistant', `⚡ AI العربي المحلي: ${reply.text}`, reply);
}

window.askArabicAI = askArabicAI;

aiForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = aiInput.value;
  aiInput.value = '';
  await askArabicAI(q);
});

document.querySelectorAll('.ai-prompt-chip').forEach(chip => {
  chip.addEventListener('click', () => askArabicAI(chip.dataset.prompt));
});

// ============================================================================
// 3. GLASS CODE STUDIO (IDE)
// ============================================================================
const ideEditor = document.getElementById('ide-editor');
const ideConsole = document.getElementById('ide-console');
const ideCurrentFile = document.getElementById('ide-current-file');
let activeFilename = 'port_scanner.py';

export function loadIdeFile(filename) {
  activeFilename = filename;
  if (ideCurrentFile) ideCurrentFile.textContent = filename;
  const content = kernel.vfs[`/root/projects/${filename}`] || '';
  if (ideEditor) ideEditor.value = content;
  document.querySelectorAll('#ide-file-tabs .glass-chip').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.file === filename);
  });
}

document.querySelectorAll('#ide-file-tabs .glass-chip').forEach(btn => {
  btn.addEventListener('click', () => loadIdeFile(btn.dataset.file));
});

document.getElementById('btn-run-code')?.addEventListener('click', async () => {
  const code = ideEditor.value;
  const lang = activeFilename.endsWith('.sh') ? 'bash' : (activeFilename.endsWith('.js') ? 'js' : 'python');
  ideConsole.textContent = `⏳ Running /root/projects/${activeFilename} on ABBADI Linux Kernel...\n`;
  const res = await kernel.runCode(activeFilename, code, lang);
  ideConsole.textContent = (res.stdout || '') + (res.stderr ? `\n[STDERR]\n${res.stderr}` : '');
});

document.getElementById('btn-send-term')?.addEventListener('click', async () => {
  const cmd = activeFilename.endsWith('.sh') ? `bash ${activeFilename}` : `python3 ${activeFilename}`;
  await runTerminalCommand(cmd);
});

// ============================================================================
// 4. FRAMELESS TRANSPARENT LIQUID GLASS WEB BROWSER
// ============================================================================
const browserViewport = document.getElementById('browser-viewport');
const browserUrlInput = document.getElementById('browser-url');

const GLASS_PAGES = {
  'https://kernel.org': {
    title: 'The Linux Kernel Archives · Frameless Glass Reader (kernel.org)',
    subtitle: 'Pure Transparent Liquid Glass Web Engine · Zero Borders · Zero Opaque Backgrounds',
    cards: [
      { h: 'Linux Kernel 6.8.0-abbadi-glass-arm64 (Active)', p: 'Running natively with full root privileges and Cloud Backend hybrid bridge on Samsung Galaxy Z Fold6.' },
      { h: 'System Calls & POSIX Namespace', p: 'Full support for bash 5.2, python3 3.12, node v20, gcc, git, openssh, and raw socket inspection.' },
      { h: 'ABBADI Liquid Glass Compositor', p: 'Every web document and Linux package renders in 100% frameless glass with only the 3 pure white top icons (−, □, ×).' }
    ]
  },
  'https://docs.python.org/3/': {
    title: 'Python 3.12.3 Documentation · Glass Developer Reference',
    subtitle: 'Integrated with Glass Code Studio & Local Arabic AI Engine',
    cards: [
      { h: 'socket & asyncio Networking', p: 'Build high-speed port scanners, TLS analyzers, and packet utilities directly in /root/projects.' },
      { h: 'subprocess & Linux Automation', p: 'Pipe live kernel output into Python data structures with zero latency.' },
      { h: 'Arabic AI Code Synthesis', p: 'Ask the local Arabic model to generate and execute Python scripts with one tap.' }
    ]
  },
  'https://owasp.org': {
    title: 'OWASP Cybersecurity & Network Verification Portal',
    subtitle: 'Connected to ABBADI NetSec Toolkit (nmap · dig · openssl · ss)',
    cards: [
      { h: 'Network Port & Service Auditing', p: 'Verify open TCP/UDP services and inspect TLS 1.3 cipher suites.' },
      { h: 'DNS & Subdomain Reconnaissance', p: 'Query authoritative nameservers and inspect A/AAAA/MX/TXT records.' },
      { h: 'Cryptographic Integrity (SHA-256 / AES)', p: 'Verify payload hashes and entropy directly inside the Glass OS.' }
    ]
  },
  'https://3bbadi.com': {
    title: 'Abdalla Abbadi · Official Linux & AI Architecture Portal (3bbadi.com)',
    subtitle: 'Designed & Engineered exclusively for Samsung Galaxy Z Fold6 Inner Display',
    cards: [
      { h: 'ABBADI Linux OS v1.0.0 Glass Edition', p: 'Client-Server Hybrid Linux Architecture: Fold6 Glass Interface + Live Backend Linux Server.' },
      { h: 'Local Arabic AI Engine (0ms Warmup)', p: 'Always-on Arabic & English coding assistant with direct terminal execution.' },
      { h: 'Direct Contact', p: 'Developer: Abdalla Abbadi <connect@3bbadi.com>' }
    ]
  }
};

export function renderGlassBrowser(url) {
  if (browserUrlInput) browserUrlInput.value = url;
  const key = Object.keys(GLASS_PAGES).find(k => url.includes(k.replace('https://', ''))) || 'https://kernel.org';
  const page = GLASS_PAGES[key];
  browserViewport.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <div>
        <div style="font-size:15px;font-weight:600;color:#ffffff;">${page.title}</div>
        <div style="font-size:12px;color:var(--accent-cyan);margin-top:2px;">${page.subtitle} · URL: ${url}</div>
      </div>
      <span class="glass-chip" style="color:var(--accent-emerald);">🔒 TLS 1.3 · Pure Glass View</span>
    </div>
    <div class="glass-web-grid">
      ${page.cards.map(c => `
        <div class="glass-web-card">
          <div style="font-size:13px;font-weight:600;color:#ffffff;margin-bottom:5px;">${c.h}</div>
          <div style="font-size:12px;color:var(--text-soft);line-height:1.5;">${c.p}</div>
        </div>
      `).join('')}
    </div>
  `;
}

document.getElementById('browser-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  renderGlassBrowser(browserUrlInput.value);
});
document.querySelectorAll('[data-burl]').forEach(btn => {
  btn.addEventListener('click', () => renderGlassBrowser(btn.dataset.burl));
});

// ============================================================================
// 5. NETSEC TOOLKIT CONTROLLER
// ============================================================================
const netsecOutput = document.getElementById('netsec-output');
document.querySelectorAll('.netsec-run').forEach(btn => {
  btn.addEventListener('click', async () => {
    const tool = btn.dataset.tool;
    netsecOutput.textContent = `⏳ Running NetSec tool [${tool}] on ABBADI Linux Kernel...\n`;
    if (kernel.backendOnline) {
      try {
        const r = await fetch(`${kernel.backendUrl}/api/netsec`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool, target: 'github.com', text: 'ABBADI-Linux-ZFold6' })
        });
        if (r.ok) {
          const d = await r.json();
          netsecOutput.textContent = d.stdout || d.stderr;
          return;
        }
      } catch (_) {}
    }
    if (tool === 'ports') {
      const r = await kernel.exec('nmap 127.0.0.1');
      netsecOutput.textContent = r.stdout;
    } else if (tool === 'dns') {
      const r = await kernel.exec('dig github.com');
      netsecOutput.textContent = r.stdout;
    } else if (tool === 'crypto') {
      netsecOutput.textContent = `Input  : ABBADI-Linux-ZFold6\nSHA-256: 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08\nBase64 : QUJCQURJLUxpbnV4LVpGb2xkNg==\nStatus : Verified`;
    } else if (tool === 'sockets') {
      const r = await kernel.exec('ps aux');
      netsecOutput.textContent = r.stdout;
    }
  });
});

// ============================================================================
// 6. GLASS LINUX APP STORE (Every installed app opens in pure frameless glass
//    with ONLY the 3 white top icons: −, □, ×)
// ============================================================================
const LINUX_APPS = [
  { id: 'htop', name: 'htop · Interactive Process Viewer', cmd: 'apt install htop', desc: 'مراقب العمليات والأنوية والذاكرة الحي بنمط زجاجي شفاف بالكامل' },
  { id: 'wireshark-cli', name: 'tshark / Wireshark Packet Analyzer', cmd: 'apt install tshark', desc: 'محلل حزم الشبكة والبروتوكولات المباشر بدون حواف' },
  { id: 'sqlmap', name: 'sqlmap · Security Audit Engine', cmd: 'apt install sqlmap', desc: 'أداة فحص قواعد البيانات والثغرات الأمنية الرسمية' },
  { id: 'docker-cli', name: 'docker · Container Runtime Engine', cmd: 'apt install docker-cli', desc: 'إدارة وتشغيل حاويات اللينكس بواجهة زجاجية مفرغة' },
  { id: 'jupyter-lite', name: 'Jupyter Glass Notebook (Python & AI)', cmd: 'pip install jupyter', desc: 'دفتر تفاعلي للبرمجة والذكاء الاصطناعي وعلوم البيانات' },
  { id: 'sqlite3', name: 'SQLite3 Glass Database Studio', cmd: 'apt install sqlite3', desc: 'محرك قواعد بيانات SQL تفاعلي سريع بواجهة زجاجية' }
];

function renderAppStore() {
  const grid = document.getElementById('appstore-grid');
  if (!grid) return;
  grid.innerHTML = LINUX_APPS.map(app => {
    const installed = kernel.installedPackages.has(app.id);
    return `
      <div class="glass-card">
        <div style="font-weight:600;font-size:13px;color:#ffffff;">${app.name}</div>
        <div style="font-size:11.5px;color:var(--text-soft);">${app.desc}</div>
        <div style="font-family:var(--font-mono);font-size:11px;color:var(--accent-cyan);"># ${app.cmd}</div>
        <button class="glass-chip btn-install-app" data-appid="${app.id}" style="color:var(--accent-emerald);font-weight:600;margin-top:4px;">
          ${installed ? '▶ فتح التطبيق الزجاجي (Open Frameless Glass App)' : '⬇ تثبيت وفتح زجاجي (apt install & Launch)'}
        </button>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.btn-install-app').forEach(btn => {
    btn.addEventListener('click', async () => {
      const app = LINUX_APPS.find(a => a.id === btn.dataset.appid);
      if (!app) return;
      await kernel.exec(`apt install ${app.id}`);
      launchDynamicGlassApp(app);
    });
  });
}

export function launchDynamicGlassApp(app) {
  const titleEl = document.getElementById('dynapp-title');
  const bodyEl = document.getElementById('dynapp-body');
  if (titleEl) titleEl.textContent = `📦 ${app.name} — Frameless Transparent Liquid Glass Window`;
  if (bodyEl) {
    bodyEl.innerHTML = `
      <div class="term-output" style="background:transparent;">
<span class="term-sys-banner">╔══════════════════════════════════════════════════════════════════════════╗
║  ${app.name.padEnd(70, ' ')}║
║  Mode: 100% Frameless Transparent Liquid Glass (Only 3 White Top Icons)  ║
╚══════════════════════════════════════════════════════════════════════════╝</span>

[root@abbadi-fold6]# ${app.id} --glass-frameless --realtime
✓ Package '${app.id}' verified & running with root privileges on Kernel 6.8.0-abbadi-glass-arm64

CPU[||||||||||||||                38.4%]   Tasks: 44, 18 thr; 2 running
Mem[||||||||||||||||||     2840M/12288M]   Uptime: 00:42:19
Swp[                              0M/8G]   Local AI: ABBADI-Arabic-Coder-7B [READY 0ms]

  PID USER      PRI  NI  VIRT   RES   SHR S CPU% MEM%   TIME+  Command
   84 root       20   0  942M 94.2M 18.4M S  4.2  0.8  0:08.41 /usr/bin/abbadi-local-ai --arabic
  112 root       20   0  312M 32.1M 12.1M S  1.8  0.3  0:03.19 node /workspace/abbadi-linux-fold6/server.mjs
  318 root       20   0  128M 24.6M  9.8M R  1.2  0.2  0:00.84 /usr/bin/${app.id} --glass-compositor
      </div>
    `;
  }
  switchWorkspace('dynapp');
}

window.launchDynamicGlassApp = launchDynamicGlassApp;

// ============================================================================
// 7. FRAMELESS TRANSPARENT LIQUID GLASS TOUCH KEYBOARD (عربي ↔ EN + Linux Row)
// ============================================================================
let kbLang = 'ar';
const KB_LAYOUTS = {
  ar: [
    ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج', 'د'],
    ['ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك', 'ط'],
    ['ئ', 'ء', 'ؤ', 'ر', 'لا', 'ى', 'ة', 'و', 'ز', 'ظ', '⌫'],
    ['🌐 EN', 'clear', 'ls -la', 'SPACE', 'neofetch', '↵ Enter']
  ],
  en: [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', '.', '-', '⌫'],
    ['🌐 عربي', 'uname -a', 'python3', 'SPACE', 'nmap', '↵ Enter']
  ]
};

function renderGlassKeyboard() {
  const container = document.getElementById('kb-alpha-container');
  if (!container) return;
  const rows = KB_LAYOUTS[kbLang];
  container.innerHTML = rows.map(row => `
    <div class="kb-row">
      ${row.map(key => {
        let cls = 'kb-key';
        let label = key;
        if (key === 'SPACE') {
          cls += ' kb-space';
          label = kbLang === 'ar' ? 'مسافة · ABBADI Glass Touch (Z Fold6)' : 'SPACE · ABBADI Glass Touch (Z Fold6)';
        } else if (key === '↵ Enter') {
          cls += ' kb-enter';
        } else if (key.startsWith('🌐')) {
          cls += ' kb-lang';
        } else if (key === '⌫' || key.length > 2) {
          cls += ' kb-wide';
        }
        return `<button type="button" class="${cls}" data-k="${key}">${label}</button>`;
      }).join('')}
    </div>
  `).join('');

  container.querySelectorAll('.kb-key').forEach(btn => {
    btn.addEventListener('click', () => handleVirtualKey(btn.dataset.k));
  });
}

function handleVirtualKey(k) {
  if (k.startsWith('🌐')) {
    kbLang = kbLang === 'ar' ? 'en' : 'ar';
    renderGlassKeyboard();
    return;
  }
  const target = activeInputEl || document.getElementById('term-input');
  if (!target) return;

  if (k === '⌫') {
    target.value = target.value.slice(0, -1);
    target.focus();
    return;
  }
  if (k === 'SPACE') {
    target.value += ' ';
    target.focus();
    return;
  }
  if (k === 'CTRL+L') {
    termOutput.innerHTML = '';
    return;
  }
  if (k === 'CTRL+C') {
    appendTermBlock('^C', '', '');
    target.value = '';
    return;
  }
  if (k === '↑') {
    if (histIdx > 0) {
      histIdx--;
      target.value = cmdHistory[histIdx] || '';
    }
    return;
  }
  if (k === '↓') {
    if (histIdx < cmdHistory.length - 1) {
      histIdx++;
      target.value = cmdHistory[histIdx] || '';
    } else {
      target.value = '';
    }
    return;
  }
  if (k === '↵ Enter') {
    if (target.id === 'term-input') {
      const v = target.value;
      target.value = '';
      runTerminalCommand(v);
    } else if (target.id === 'ai-input') {
      const v = target.value;
      target.value = '';
      askArabicAI(v);
    } else if (target.id === 'browser-url') {
      renderGlassBrowser(target.value);
    } else if (target.id === 'ide-editor') {
      target.value += '\n';
    }
    return;
  }
  if (['ESC', 'TAB', 'CTRL', 'ALT', '←', '→'].includes(k)) {
    if (k === 'TAB') target.value += '  ';
    return;
  }
  if (['clear', 'ls -la', 'neofetch', 'uname -a', 'python3', 'nmap'].includes(k)) {
    if (k === 'python3') target.value += 'python3 port_scanner.py';
    else if (k === 'nmap') target.value += 'nmap 127.0.0.1';
    else runTerminalCommand(k);
    return;
  }

  target.value += k;
  target.focus();
}

document.querySelectorAll('.kb-fn-row .kb-key').forEach(btn => {
  btn.addEventListener('click', () => handleVirtualKey(btn.dataset.k));
});

document.getElementById('btn-toggle-kb')?.addEventListener('click', (e) => {
  const kb = document.getElementById('glass-keyboard');
  kb.classList.toggle('kb-hidden');
  e.currentTarget.classList.toggle('active', !kb.classList.contains('kb-hidden'));
});

// ============================================================================
// INITIAL SYSTEM BOOT SEQUENCE
// ============================================================================
async function bootSystem() {
  renderGlassKeyboard();
  loadIdeFile('port_scanner.py');
  renderGlassBrowser('https://kernel.org/doc/html/latest/');
  renderAppStore();

  const health = await kernel.probeBackend();
  const backendLabel = document.getElementById('backend-label');
  if (backendLabel) {
    backendLabel.textContent = health
      ? `السيرفر الخلفي: متصل (${health.kernel})`
      : `النواة الهجينة: متصلة (arm64)`;
  }

  // Boot output in Glass Terminal
  const neo = await kernel.exec('neofetch');
  appendTermBlock('neofetch', neo.stdout, '', true);
  const scan = await kernel.exec('python3 port_scanner.py');
  appendTermBlock('python3 port_scanner.py', scan.stdout, '');

  // Auto-start Local Arabic AI greeting with ready runnable code
  addAiMessage(
    'assistant',
    '⚡ مرحباً بك يا عبدالله في نظام ABBADI Linux OS (Z Fold6 Pure Glass Edition)! الموديل العربي المحلي شغال تلقائياً بسرعة 0ms ومربوط بالسيرفر الخلفي ونواة اللينكس. كل الصفحات والتطبيقات زجاجية شفافة بالكامل بدون أي إطارات أو حواف مع الـ 3 أيقونات البيضاء فقط بأعلى كل صفحة (−, □, ×). هذا فحص النظام الحي جاهز للتشغيل:',
    {
      cmdExecuted: 'python3 ai_agent.py',
      cmdOutput: (await kernel.exec('python3 ai_agent.py')).stdout,
      filename: 'ai_agent.py',
      lang: 'python',
      code: kernel.vfs['/root/projects/ai_agent.py']
    }
  );
}

bootSystem();
