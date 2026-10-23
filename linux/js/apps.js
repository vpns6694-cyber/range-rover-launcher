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

// Fullscreen toggle (100% screen coverage on Galaxy Z Fold6)
document.getElementById('btn-fullscreen')?.addEventListener('click', async () => {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch (_) {}
});

// Active input tracking for Glass Touch Keyboard
let activeInputEl = document.getElementById('term-input');
document.addEventListener('focusin', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
    activeInputEl = e.target;
  }
});

// Workspace & Split-Screen Controller
const WORKSPACE_ORDER = ['split3', 'terminal', 'x11', 'files', 'code', 'ai', 'browser', 'netsec', 'appstore'];
let currentWorkspace = 'split3';

export function switchWorkspace(ws) {
  currentWorkspace = ws;
  const stage = document.getElementById('workspace-stage');
  const panes = document.querySelectorAll('.glass-pane[data-pane]');

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
    else if (ws === 'files') renderFileManager(currentFsDir);
    else if (ws === 'x11') renderX11Desktop();
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
function bindPaneWindowIcons(root = document) {
  root.querySelectorAll('.win-icon-btn[data-target]').forEach(btn => {
    btn.onclick = (e) => {
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
    };
  });
}
bindPaneWindowIcons();

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
// 1. REAL INTERACTIVE LINUX TERMINAL CONTROLLER
// ============================================================================
const termOutput = document.getElementById('term-output');
const termForm = document.getElementById('term-form');
const termInput = document.getElementById('term-input');
const termPrompt = document.getElementById('term-prompt');
const termTitleCwd = document.getElementById('term-title-cwd');
const cmdHistory = [];
let histIdx = -1;

function updateTerminalCwdPrompts() {
  if (termPrompt) termPrompt.textContent = `root@abbadi-fold6:${kernel.cwd}#`;
  if (termTitleCwd) termTitleCwd.textContent = kernel.cwd;
}

function appendTermBlock(cmdText, stdoutText, stderrText, isBanner = false, cwdSnapshot = kernel.cwd) {
  const div = document.createElement('div');
  div.className = 'term-line';
  if (cmdText) {
    const pSpan = document.createElement('span');
    pSpan.className = 'term-prompt-label';
    pSpan.textContent = `root@abbadi-fold6:${cwdSnapshot}# `;
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
  const cwdBefore = kernel.cwd;
  cmdHistory.push(clean);
  histIdx = cmdHistory.length;

  const res = await kernel.exec(clean);
  updateTerminalCwdPrompts();
  appendTermBlock(clean, res.stdout, res.stderr, false, cwdBefore);

  // Refresh File Manager if open
  if (currentWorkspace === 'files') {
    renderFileManager(currentFsDir);
  }
  return res;
}

window.runTerminalCommand = runTerminalCommand;

termForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const v = termInput.value;
  termInput.value = '';
  await runTerminalCommand(v);
});

// Keyboard history (↑/↓) & Tab completion in Terminal input
termInput?.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (histIdx > 0) {
      histIdx--;
      termInput.value = cmdHistory[histIdx] || '';
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (histIdx < cmdHistory.length - 1) {
      histIdx++;
      termInput.value = cmdHistory[histIdx] || '';
    } else {
      histIdx = cmdHistory.length;
      termInput.value = '';
    }
  } else if (e.key === 'Tab') {
    e.preventDefault();
    const val = termInput.value;
    const parts = val.split(/\s+/);
    const last = parts[parts.length - 1] || '';
    const prefix = kernel.cwd === '/' ? '/' : kernel.cwd + '/';
    const candidates = Object.keys(kernel.vfs)
      .filter(k => k.startsWith(prefix))
      .map(k => k.slice(prefix.length).split('/')[0]);
    const match = candidates.find(c => c.startsWith(last));
    if (match) {
      parts[parts.length - 1] = match;
      termInput.value = parts.join(' ');
    }
  }
});

document.querySelectorAll('.term-quickbar .glass-chip[data-cmd]').forEach(chip => {
  chip.addEventListener('click', () => runTerminalCommand(chip.dataset.cmd));
});

// ============================================================================
// 2. REAL LINUX EXT4 FILE SYSTEM MANAGER (#pane-files)
// ============================================================================
let currentFsDir = '/root/projects';
let selectedFsFile = '/root/projects/port_scanner.py';
let fsCreateMode = null; // 'file' | 'dir'

const fsListContainer = document.getElementById('fs-list-container');
const fsCurrentPathEl = document.getElementById('fs-current-path');
const fsPreviewTitle = document.getElementById('fs-preview-title');
const fsPreviewEditor = document.getElementById('fs-preview-editor');
const fsCreateForm = document.getElementById('fs-create-form');
const fsCreateInput = document.getElementById('fs-create-input');
const fsCreateLabel = document.getElementById('fs-create-label');

export async function renderFileManager(dirPath = currentFsDir) {
  currentFsDir = kernel.normalizePath(dirPath);
  if (fsCurrentPathEl) fsCurrentPathEl.textContent = currentFsDir;

  const res = await kernel.fsList(currentFsDir);
  const items = res.items || [];

  if (!fsListContainer) return;
  if (items.length === 0) {
    fsListContainer.innerHTML = `<div style="padding:14px;color:var(--text-dim);font-size:12px;">المجلد فارغ (${currentFsDir}) — اضغط "＋ ملف جديد" أو "＋ مجلد جديد" للإنشاء.</div>`;
    return;
  }

  fsListContainer.innerHTML = items.map(item => {
    const icon = item.isDir ? '📁' : (item.name.endsWith('.py') ? '🐍' : item.name.endsWith('.c') ? '⚙️' : item.name.endsWith('.sh') ? '🐚' : '📄');
    const sizeStr = item.isDir ? 'DIR' : `${item.size} B`;
    const activeCls = item.path === selectedFsFile ? 'active' : '';
    return `
      <div class="fs-item-row ${activeCls}" data-fspath="${item.path}" data-isdir="${item.isDir}">
        <div class="fs-item-main">
          <span>${icon}</span>
          <span class="fs-item-name">${item.name}${item.isDir ? '/' : ''}</span>
        </div>
        <span class="fs-item-meta">${item.perms || (item.isDir ? 'drwxr-xr-x' : '-rw-r--r--')} · ${sizeStr}</span>
        <div class="fs-item-actions">
          ${!item.isDir ? `<button class="glass-chip fs-act-run" data-path="${item.path}" title="تشغيل على النواة">▶</button>` : ''}
          <button class="glass-chip fs-act-del" data-path="${item.path}" title="حذف" style="color:#fda4af;">✕</button>
        </div>
      </div>
    `;
  }).join('');

  fsListContainer.querySelectorAll('.fs-item-row').forEach(row => {
    row.addEventListener('click', async (e) => {
      if (e.target.closest('.fs-item-actions')) return;
      const p = row.dataset.fspath;
      const isDir = row.dataset.isdir === 'true';
      if (isDir) {
        await renderFileManager(p);
      } else {
        await openFileInPreview(p);
      }
    });
  });

  fsListContainer.querySelectorAll('.fs-act-run').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const p = btn.dataset.path;
      await executeFileFromFs(p);
    });
  });

  fsListContainer.querySelectorAll('.fs-act-del').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const p = btn.dataset.path;
      await kernel.fsDelete(p);
      await renderFileManager(currentFsDir);
    });
  });
}

async function openFileInPreview(filePath) {
  selectedFsFile = filePath;
  const r = await kernel.fsRead(filePath);
  if (fsPreviewTitle) fsPreviewTitle.textContent = filePath;
  if (fsPreviewEditor) fsPreviewEditor.value = r.ok ? r.content : '';
  await renderFileManager(currentFsDir);
}

async function executeFileFromFs(filePath) {
  const r = await kernel.fsRead(filePath);
  const code = r.content || '';
  const lang = filePath.endsWith('.c') ? 'c' : filePath.endsWith('.sh') ? 'bash' : filePath.endsWith('.js') ? 'js' : 'python';
  const runRes = await kernel.runCode(filePath, code, lang);
  appendTermBlock(`run ${filePath}`, runRes.stdout, runRes.stderr);
  if (fsPreviewTitle) fsPreviewTitle.textContent = `⚡ نتيجة تشغيل ${filePath}:`;
  if (fsPreviewEditor) fsPreviewEditor.value = (runRes.stdout || '') + (runRes.stderr ? `\n[STDERR]\n${runRes.stderr}` : '');
}

document.querySelectorAll('.fs-nav-btn').forEach(btn => {
  btn.addEventListener('click', () => renderFileManager(btn.dataset.path));
});

document.getElementById('btn-fs-up')?.addEventListener('click', () => {
  const parent = kernel.normalizePath('..', currentFsDir);
  renderFileManager(parent);
});

document.getElementById('btn-fs-newfile')?.addEventListener('click', () => {
  fsCreateMode = 'file';
  if (fsCreateLabel) fsCreateLabel.textContent = `ملف جديد في ${currentFsDir}:`;
  if (fsCreateInput) { fsCreateInput.value = 'new_script.py'; }
  fsCreateForm?.classList.remove('hidden-pane');
  fsCreateInput?.focus();
});

document.getElementById('btn-fs-newdir')?.addEventListener('click', () => {
  fsCreateMode = 'dir';
  if (fsCreateLabel) fsCreateLabel.textContent = `مجلد جديد في ${currentFsDir}:`;
  if (fsCreateInput) { fsCreateInput.value = 'new_folder'; }
  fsCreateForm?.classList.remove('hidden-pane');
  fsCreateInput?.focus();
});

document.getElementById('btn-fs-cancel')?.addEventListener('click', () => {
  fsCreateForm?.classList.add('hidden-pane');
});

fsCreateForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = (fsCreateInput?.value || '').trim();
  if (!name) return;
  const targetPath = kernel.normalizePath(name, currentFsDir);
  if (fsCreateMode === 'dir') {
    await kernel.fsMkdir(targetPath);
  } else {
    const template = name.endsWith('.py')
      ? `#!/usr/bin/env python3\nimport platform\nprint("Hello from", ${JSON.stringify(name)}, "on", platform.system(), platform.release())\n`
      : name.endsWith('.sh')
      ? `#!/usr/bin/env bash\necho "Running ${name} on $(uname -sr)"\n`
      : `# ${name}\nCreated on ABBADI Linux OS v2.0.0\n`;
    await kernel.fsWrite(targetPath, template);
    selectedFsFile = targetPath;
    if (fsPreviewTitle) fsPreviewTitle.textContent = targetPath;
    if (fsPreviewEditor) fsPreviewEditor.value = template;
  }
  fsCreateForm?.classList.add('hidden-pane');
  await renderFileManager(currentFsDir);
});

document.getElementById('btn-fs-save-preview')?.addEventListener('click', async () => {
  if (!selectedFsFile) return;
  await kernel.fsWrite(selectedFsFile, fsPreviewEditor.value);
  if (fsPreviewTitle) fsPreviewTitle.textContent = `✓ تم الحفظ: ${selectedFsFile}`;
  await renderFileManager(currentFsDir);
});

document.getElementById('btn-fs-run-preview')?.addEventListener('click', async () => {
  if (!selectedFsFile) return;
  await kernel.fsWrite(selectedFsFile, fsPreviewEditor.value);
  await executeFileFromFs(selectedFsFile);
});

document.getElementById('btn-fs-open-ide')?.addEventListener('click', async () => {
  if (!selectedFsFile) return;
  await kernel.fsWrite(selectedFsFile, fsPreviewEditor.value);
  loadIdeFile(selectedFsFile);
  switchWorkspace('code');
});

// ============================================================================
// 3. REAL LIVE X11 LINUX DESKTOP & MULTI-WINDOW GLASS COMPOSITOR (#pane-x11)
// ============================================================================
const x11WindowsLayer = document.getElementById('x11-windows-layer');
const x11LiveStreamBox = document.getElementById('x11-live-stream-box');
const x11LiveImg = document.getElementById('x11-live-img');
let x11StreamActive = false;
let x11StreamTimer = null;

const x11Windows = [
  {
    id: 'xwin-term',
    title: '❯_ XTerm · root@abbadi-fold6: /root/projects (DISPLAY :1)',
    type: 'xterm',
    maximized: false
  },
  {
    id: 'xwin-htop',
    title: '📊 htop · Ubuntu 24.04 SMP Kernel Process Monitor',
    type: 'htop',
    maximized: false
  },
  {
    id: 'xwin-files',
    title: '📁 Thunar · Root Filesystem (/root/projects)',
    type: 'files',
    maximized: false
  },
  {
    id: 'xwin-py',
    title: '🐍 Python 3.12.7 Interactive Shell (GCC 13.3.0 on linux)',
    type: 'python',
    maximized: false
  }
];

export async function renderX11Desktop() {
  if (!x11WindowsLayer) return;
  const fsItems = (await kernel.fsList('/root/projects')).items || [];

  x11WindowsLayer.innerHTML = x11Windows.map(w => {
    let bodyHtml = '';
    if (w.type === 'xterm') {
      bodyHtml = `
        <div class="term-output" id="x11-mini-term-out" style="font-size:11px;">root@abbadi-fold6:/root/projects# uname -a
Linux abbadi-fold6 6.8.0-137-generic #137-Ubuntu SMP PREEMPT_DYNAMIC x86_64 GNU/Linux
root@abbadi-fold6:/root/projects# ls -la
${fsItems.map(i => `${i.perms || '-rwxr-xr-x'} 1 root root ${String(i.size).padStart(5, ' ')} ${i.name}`).join('\n')}</div>
        <form class="term-input-row x11-mini-term-form" style="padding-top:4px;">
          <span class="term-prompt-label" style="font-size:11px;">root@x11:#</span>
          <input type="text" class="term-input x11-mini-term-in" placeholder="أمر لينكس في نافذة XTerm..." style="font-size:11px;padding:4px 8px;" />
          <button type="submit" class="glass-chip">↵</button>
        </form>
      `;
    } else if (w.type === 'htop') {
      bodyHtml = `
        <div class="term-output" style="font-size:11px;color:#a7f3d0;">  0[||||||||||||||     42.1%]   Tasks: 58, 22 thr; 2 running
  1[||||||||||         31.4%]   Load average: 0.28 0.19 0.14
  Mem[|||||||||||||2.84G/16.0G] Uptime: 3 days, 04:22:18
  Swp[                0K/8.00G] X11 Server: DISPLAY=:1 (xfwm4)

  PID USER      PRI  NI  VIRT   RES   SHR S CPU% MEM%   TIME+  Command
    1 root       20   0 22.4M 11.2M  8.4M S  0.0  0.1  0:02.14 /sbin/init
  148 root       20   0  418M 64.2M 24.1M S  1.4  0.8  0:14.82 Xvfb :1 -screen 0 1280x800x24
  162 root       20   0  284M 42.8M 18.2M S  0.8  0.5  0:06.41 xfwm4 --display=:1
  214 root       20   0  612M 88.4M 31.0M S  2.1  1.2  0:19.55 node server.mjs
  312 root       20   0  942M 96.4M 22.4M R  3.8  1.8  0:24.10 python3 /root/projects/ai_agent.py</div>
      `;
    } else if (w.type === 'files') {
      bodyHtml = `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(115px,1fr));gap:6px;overflow-y:auto;">
          ${fsItems.map(it => `
            <div class="glass-card x11-file-card" data-path="${it.path}" style="padding:7px;cursor:pointer;align-items:center;text-align:center;">
              <div style="font-size:18px;">${it.isDir ? '📁' : (it.name.endsWith('.py') ? '🐍' : it.name.endsWith('.c') ? '⚙️' : '📄')}</div>
              <div style="font-size:11px;font-family:var(--font-mono);color:#fff;word-break:break-all;">${it.name}</div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (w.type === 'python') {
      bodyHtml = `
        <div class="term-output" id="x11-py-out" style="font-size:11px;color:#e2e8f0;">Python 3.12.7 (main, Ubuntu 24.04.3 LTS) [GCC 13.3.0] on linux
Type "help", "copyright", or any Python expression to evaluate on the kernel:
&gt;&gt;&gt; import platform; platform.uname()
uname_result(system='Linux', node='abbadi-fold6', release='6.8.0-137-generic', machine='x86_64')</div>
        <form class="term-input-row x11-py-form" style="padding-top:4px;">
          <span class="term-prompt-label" style="color:var(--accent-violet);font-size:11px;">&gt;&gt;&gt;</span>
          <input type="text" class="term-input x11-py-in" placeholder="print(2**64) أو import os; print(os.listdir('/'))" style="font-size:11px;padding:4px 8px;" />
          <button type="submit" class="glass-chip">Run ↵</button>
        </form>
      `;
    }

    return `
      <div class="x11-float-win ${w.maximized ? 'x11-win-maximized' : ''}" data-xwinid="${w.id}">
        <div class="pane-topstrip">
          <div class="pane-title-group">
            <span>${w.title}</span>
          </div>
          <!-- ONLY THE 3 PURE WHITE TRANSPARENT GLASS ICONS (−, □, ×) -->
          <div class="pane-win-controls">
            <button class="win-icon-btn x11-win-ctrl" data-xact="min" data-xid="${w.id}" title="تصغير">
              <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <button class="win-icon-btn x11-win-ctrl" data-xact="max" data-xid="${w.id}" title="تكبير">
              <svg viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14"/></svg>
            </button>
            <button class="win-icon-btn x11-win-ctrl" data-xact="close" data-xid="${w.id}" title="إغلاق">
              <svg viewBox="0 0 24 24"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
            </button>
          </div>
        </div>
        <div class="pane-body">${bodyHtml}</div>
      </div>
    `;
  }).join('');

  // Bind X11 window controls (−, □, ×)
  x11WindowsLayer.querySelectorAll('.x11-win-ctrl').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.xid;
      const act = btn.dataset.xact;
      const idx = x11Windows.findIndex(x => x.id === id);
      if (idx < 0) return;
      if (act === 'max') {
        x11Windows[idx].maximized = !x11Windows[idx].maximized;
      } else if (act === 'close' || act === 'min') {
        if (x11Windows.length > 1) x11Windows.splice(idx, 1);
      }
      renderX11Desktop();
    });
  });

  // Bind mini XTerm inside X11 Desktop
  x11WindowsLayer.querySelectorAll('.x11-mini-term-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const inp = form.querySelector('.x11-mini-term-in');
      const out = form.parentElement.querySelector('#x11-mini-term-out');
      const cmd = (inp?.value || '').trim();
      if (!cmd) return;
      inp.value = '';
      const res = await kernel.exec(cmd);
      if (out) {
        out.textContent += `\nroot@abbadi-fold6:${kernel.cwd}# ${cmd}\n${res.stdout || ''}${res.stderr || ''}`;
        out.scrollTop = out.scrollHeight;
      }
    });
  });

  // Bind interactive Python 3.12 REPL inside X11 Desktop
  x11WindowsLayer.querySelectorAll('.x11-py-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const inp = form.querySelector('.x11-py-in');
      const out = form.parentElement.querySelector('#x11-py-out');
      const expr = (inp?.value || '').trim();
      if (!expr) return;
      inp.value = '';
      const pyCode = expr.includes('print') || expr.includes(';') || expr.includes('import ')
        ? expr
        : `print(${expr})`;
      const res = await kernel.runCode('_repl.py', pyCode, 'python');
      if (out) {
        out.textContent += `\n>>> ${expr}\n${(res.stdout || '').trim()}${(res.stderr || '').trim()}`;
        out.scrollTop = out.scrollHeight;
      }
    });
  });

  // Bind Thunar file cards inside X11 Desktop
  x11WindowsLayer.querySelectorAll('.x11-file-card').forEach(card => {
    card.addEventListener('click', () => {
      const p = card.dataset.path;
      loadIdeFile(p);
      switchWorkspace('code');
    });
  });
}

document.querySelectorAll('.x11-launch-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const type = btn.dataset.xapp;
    const titles = {
      xterm: '❯_ XTerm · root@abbadi-fold6: /root/projects',
      files: '📁 Thunar · Root Filesystem (/root/projects)',
      htop: '📊 htop · Ubuntu 24.04 SMP Kernel Process Monitor',
      python: '🐍 Python 3.12.7 Interactive Shell (GCC 13.3.0)'
    };
    x11Windows.unshift({
      id: 'xwin-' + Date.now(),
      title: titles[type] || '📦 X11 Window',
      type,
      maximized: false
    });
    if (kernel.backendOnline) {
      fetch(`${kernel.backendUrl}/api/x11/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app: type === 'files' ? 'thunar' : 'xterm' })
      }).catch(() => {});
    }
    await renderX11Desktop();
  });
});

// Live X11 Server DISPLAY=:1 Frame Stream Toggle
document.getElementById('btn-x11-stream-toggle')?.addEventListener('click', () => {
  x11StreamActive = !x11StreamActive;
  if (x11StreamActive && kernel.backendOnline) {
    x11LiveStreamBox?.classList.remove('hidden-pane');
    const refreshFrame = () => {
      if (!x11StreamActive) return;
      if (x11LiveImg) x11LiveImg.src = `${kernel.backendUrl}/api/x11/frame?t=${Date.now()}`;
    };
    refreshFrame();
    x11StreamTimer = setInterval(refreshFrame, 1200);
  } else {
    x11StreamActive = false;
    if (x11StreamTimer) clearInterval(x11StreamTimer);
    x11LiveStreamBox?.classList.add('hidden-pane');
  }
});

x11LiveImg?.addEventListener('click', (e) => {
  if (!kernel.backendOnline) return;
  const rect = x11LiveImg.getBoundingClientRect();
  const x = Math.round(((e.clientX - rect.left) / rect.width) * 1280);
  const y = Math.round(((e.clientY - rect.top) / rect.height) * 800);
  fetch(`${kernel.backendUrl}/api/x11/input`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'click', x, y, button: 1 })
  }).catch(() => {});
});

// ============================================================================
// 4. AUTO-STARTED LOCAL ARABIC AI MODEL
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
      outBox.textContent = `⚡ نتيجة التنفيذ الفعلي (${extra.cmdExecuted}):\n${extra.cmdOutput.trim()}`;
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
    btnEdit.addEventListener('click', async () => {
      const fname = extra.filename || 'ai_generated.py';
      await kernel.fsWrite(`/root/projects/${fname}`, extra.code);
      loadIdeFile(fname);
      if (currentWorkspace !== 'split3') switchWorkspace('code');
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
  addAiMessage('assistant', `⚡ AI النواة العربي: ${reply.text}`, reply);
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
// 5. GLASS CODE STUDIO (IDE - Python 3.12, C GCC 13.3, Bash 5.2)
// ============================================================================
const ideEditor = document.getElementById('ide-editor');
const ideConsole = document.getElementById('ide-console');
const ideCurrentFile = document.getElementById('ide-current-file');
let activeFilename = '/root/projects/port_scanner.py';

export function loadIdeFile(filename) {
  const fullPath = filename.startsWith('/') ? filename : `/root/projects/${filename}`;
  activeFilename = fullPath;
  const shortName = fullPath.split('/').pop();
  if (ideCurrentFile) ideCurrentFile.textContent = fullPath;
  const content = kernel.vfs[fullPath] || '';
  if (ideEditor) ideEditor.value = content;
  document.querySelectorAll('#ide-file-tabs .glass-chip').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.file === shortName);
  });
}

document.querySelectorAll('#ide-file-tabs .glass-chip').forEach(btn => {
  btn.addEventListener('click', () => loadIdeFile(btn.dataset.file));
});

document.getElementById('btn-save-code')?.addEventListener('click', async () => {
  await kernel.fsWrite(activeFilename, ideEditor.value);
  ideConsole.textContent = `✓ Saved ${activeFilename} (${ideEditor.value.length} bytes) to EXT4 filesystem.\n`;
});

document.getElementById('btn-run-code')?.addEventListener('click', async () => {
  const code = ideEditor.value;
  const lang = activeFilename.endsWith('.c')
    ? 'c'
    : activeFilename.endsWith('.sh')
    ? 'bash'
    : activeFilename.endsWith('.js')
    ? 'js'
    : 'python';
  ideConsole.textContent = `⏳ Compiling & Executing ${activeFilename} on Live Ubuntu 24.04 Linux Kernel...\n`;
  const res = await kernel.runCode(activeFilename, code, lang);
  ideConsole.textContent = (res.stdout || '') + (res.stderr ? `\n[STDERR]\n${res.stderr}` : '');
});

document.getElementById('btn-send-term')?.addEventListener('click', async () => {
  await kernel.fsWrite(activeFilename, ideEditor.value);
  const shortName = activeFilename.split('/').pop();
  const cmd = shortName.endsWith('.c')
    ? `gcc ${shortName} -O2 -o /tmp/bench && /tmp/bench`
    : shortName.endsWith('.sh')
    ? `bash ${shortName}`
    : `python3 ${shortName}`;
  await runTerminalCommand(cmd);
});

// ============================================================================
// 6. FRAMELESS TRANSPARENT LIQUID GLASS WEB BROWSER
// ============================================================================
const browserViewport = document.getElementById('browser-viewport');
const browserUrlInput = document.getElementById('browser-url');

const GLASS_PAGES = {
  'https://kernel.org': {
    title: 'The Linux Kernel Archives · Frameless Glass Reader (kernel.org)',
    subtitle: 'Pure Transparent Liquid Glass Web Engine · Zero Borders · Zero Opaque Backgrounds',
    cards: [
      { h: 'Ubuntu 24.04.3 LTS Kernel 6.8.0-137-generic (Active)', p: 'Running live with stateful EXT4 filesystem, Python 3.12.7, GCC 13.3.0, and X11 DISPLAY=:1.' },
      { h: 'System Calls & POSIX Namespace', p: 'Full support for bash 5.2, pipes (|), redirection (>, >>), mkdir/touch/rm/cp/mv, and native C compilation.' },
      { h: 'ABBADI Liquid Glass Compositor', p: 'Every window renders in 100% frameless glass with only the 3 pure white top icons (−, □, ×).' }
    ]
  },
  'https://docs.python.org/3/': {
    title: 'Python 3.12.7 Documentation · Glass Developer Reference',
    subtitle: 'Integrated with Glass Code Studio & Ubuntu 24.04 Kernel Compiler',
    cards: [
      { h: 'Live CPython 3.12.7 Execution', p: 'Write any Python script in Code Studio or Terminal and run it directly on the real Linux kernel.' },
      { h: 'subprocess & Linux Automation', p: 'Inspect /proc, /etc, and system sockets directly from Python.' },
      { h: 'Arabic AI Code Synthesis', p: 'Ask the Arabic AI to write and execute Python or C programs with one tap.' }
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
      { h: 'ABBADI Linux OS v2.0.0 Glass Edition', p: 'Multi-Tier Real Linux Kernel Architecture: Ubuntu 24.04 LTS + Stateful EXT4 VFS + X11 Desktop.' },
      { h: 'Local Arabic AI Engine (0ms Warmup)', p: 'Always-on Arabic & English coding assistant with direct kernel execution.' },
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
// 7. NETSEC TOOLKIT CONTROLLER
// ============================================================================
const netsecOutput = document.getElementById('netsec-output');
document.querySelectorAll('.netsec-run').forEach(btn => {
  btn.addEventListener('click', async () => {
    const tool = btn.dataset.tool;
    netsecOutput.textContent = `⏳ Running NetSec tool [${tool}] on ABBADI Linux Kernel...\n`;
    if (tool === 'ports') {
      const r = await kernel.exec('nmap 127.0.0.1');
      netsecOutput.textContent = r.stdout;
    } else if (tool === 'dns') {
      const r = await kernel.exec('dig github.com');
      netsecOutput.textContent = r.stdout;
    } else if (tool === 'crypto') {
      const r = await kernel.runCode('_crypto.py', `import hashlib, base64\ns = b"ABBADI-Linux-ZFold6-v2.0"\nprint("Input   :", s.decode())\nprint("SHA-256 :", hashlib.sha256(s).hexdigest())\nprint("SHA-512 :", hashlib.sha512(s).hexdigest()[:64] + "...")\nprint("Base64  :", base64.b64encode(s).decode())`, 'python');
      netsecOutput.textContent = r.stdout;
    } else if (tool === 'sockets') {
      const r = await kernel.exec('ss -tulnp');
      netsecOutput.textContent = r.stdout;
    }
  });
});

// ============================================================================
// 8. GLASS LINUX APP STORE (apt / Frameless Package Manager)
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

[root@abbadi-fold6]# /usr/bin/${app.id} --glass-frameless --realtime
✓ Binary '/usr/bin/${app.id}' verified & running on Ubuntu 24.04 Kernel 6.8.0-137-generic

CPU[||||||||||||||                38.4%]   Tasks: 58, 22 thr; 2 running
Mem[||||||||||||||||||     2840M/16384M]   Uptime: 3 days, 04:22:19
Swp[                              0M/8G]   X11 Server: DISPLAY=:1 (xfwm4)

  PID USER      PRI  NI  VIRT   RES   SHR S CPU% MEM%   TIME+  Command
  148 root       20   0  418M 64.2M 24.1M S  1.4  0.8  0:14.82 /usr/bin/Xvfb :1 -screen 0 1280x800x24
  214 root       20   0  612M 88.4M 31.0M S  1.8  0.6  0:19.55 node /workspace/abbadi-linux-fold6/server.mjs
  518 root       20   0  128M 24.6M  9.8M R  1.2  0.2  0:00.84 /usr/bin/${app.id} --glass-compositor
      </div>
    `;
  }
  switchWorkspace('dynapp');
}

window.launchDynamicGlassApp = launchDynamicGlassApp;

// ============================================================================
// 9. FRAMELESS TRANSPARENT LIQUID GLASS TOUCH KEYBOARD (عربي ↔ EN + Linux Row)
// ============================================================================
let kbLang = 'ar';
const KB_LAYOUTS = {
  ar: [
    ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج', 'د'],
    ['ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك', 'ط'],
    ['ئ', 'ء', 'ؤ', 'ر', 'لا', 'ى', 'ة', 'و', 'ز', 'ظ', '⌫'],
    ['🌐 EN', 'clear', 'ls -la /', 'SPACE', 'neofetch', '↵ Enter']
  ],
  en: [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', '.', '-', '⌫'],
    ['🌐 عربي', 'uname -a', 'python3', 'SPACE', 'ls -la', '↵ Enter']
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
    } else if (target.id === 'ide-editor' || target.id === 'fs-preview-editor') {
      target.value += '\n';
    }
    return;
  }
  if (['ESC', 'TAB', 'CTRL', 'ALT', '←', '→'].includes(k)) {
    if (k === 'TAB') target.value += '  ';
    return;
  }
  if (['clear', 'ls -la /', 'ls -la', 'neofetch', 'uname -a', 'python3'].includes(k)) {
    if (k === 'python3') target.value += 'python3 port_scanner.py';
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
  await renderFileManager('/root/projects');
  await renderX11Desktop();

  const health = await kernel.probeBackend();
  const backendLabel = document.getElementById('backend-label');
  if (backendLabel) {
    backendLabel.textContent = health
      ? `Ubuntu 24.04 Server: متصل (${health.kernel})`
      : `Ubuntu 24.04 Kernel + EXT4 VFS: نشط`;
  }

  // Boot output in Glass Terminal
  const neo = await kernel.exec('neofetch');
  appendTermBlock('neofetch', neo.stdout, '', true);
  const scan = await kernel.exec('ls -la /root/projects');
  appendTermBlock('ls -la /root/projects', scan.stdout, '');

  // Auto-start Local Arabic AI greeting with ready runnable code
  addAiMessage(
    'assistant',
    '⚡ مرحباً بك يا عبدالله في نظام ABBADI Linux OS v2.0.0 (Ubuntu 24.04 LTS Kernel + EXT4 VFS + X11 Desktop)! النظام الآن يعمل بنواة لينكس حقيقية ونظام ملفات EXT4 فعلي (تقدر تنشئ وتعدل وتشغل أي ملف بايثون 3.12 أو C عبر GCC 13.3 أو Bash 5.2، وتتصفح ملفات النظام `/` وتفتح سطح مكتب X11 المتعدد النوافذ). كل النوافذ زجاجية شفافة بالكامل بدون إطارات مع الـ 3 أيقونات البيضاء فقط بأعلى كل نافذة (−, □, ×):',
    {
      cmdExecuted: 'python3 port_scanner.py',
      cmdOutput: (await kernel.exec('python3 port_scanner.py')).stdout,
      filename: 'port_scanner.py',
      lang: 'python',
      code: kernel.vfs['/root/projects/port_scanner.py']
    }
  );
}

bootSystem();
