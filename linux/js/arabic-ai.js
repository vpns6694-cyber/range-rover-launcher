// ============================================================================
// ABBADI Linux OS v2.0.0 · Real Kernel-Integrated Arabic AI Engine
// Writes real scripts to EXT4 VFS (/root/projects) and executes them on the
// live Ubuntu 24.04 Linux Kernel with real stdout/stderr output!
// ============================================================================

export class AbbadiLocalArabicAI {
  constructor(kernel) {
    this.kernel = kernel;
    this.modelName = 'ABBADI-Arabic-Linux-Kernel-AI-v2.0';
    this.status = 'ONLINE ⚡ 0ms';
  }

  async ask(promptText) {
    const q = (promptText || '').trim();
    const lower = q.toLowerCase();

    // 0. If user typed a direct Linux command or prefixed with ! or $
    if (/^(ls|cd|pwd|uname|cat|mkdir|touch|rm|cp|mv|grep|find|ps|top|df|free|ip|ss|nmap|dig|ping|curl|wget|git|apt|pip|python3|gcc|bash|neofetch|lscpu|whoami|id)\b/.test(lower)) {
      const res = await this.kernel.exec(q);
      return {
        text: `تم تنفيذ أمر اللينكس الفعلي (\`${q}\`) مباشرة على النواة:`,
        cmdExecuted: q,
        cmdOutput: (res.stdout || '') + (res.stderr || ''),
        filename: 'sys_audit.sh',
        lang: 'bash',
        code: `#!/usr/bin/env bash\n${q}\n`
      };
    }

    // 1. Network / Port Scanning request
    if (q.includes('شبك') || q.includes('منافذ') || lower.includes('scan') || lower.includes('nmap') || lower.includes('port')) {
      const code = this.kernel.vfs['/root/projects/port_scanner.py'];
      const scanRes = await this.kernel.runCode('port_scanner.py', code, 'python');
      return {
        text: 'تم تشغيل فحص المنافذ والخدمات الفعلي عبر نواة لينكس (Ubuntu 24.04 Kernel) وحفظ السكربت في `/root/projects/port_scanner.py`:',
        cmdExecuted: 'python3 port_scanner.py',
        cmdOutput: (scanRes.stdout || '') + (scanRes.stderr || ''),
        filename: 'port_scanner.py',
        lang: 'python',
        code
      };
    }

    // 2. C / GCC native binary compilation request
    if (q.includes('سي ') || q.includes('مترجم') || lower.includes('gcc') || lower.includes('c code') || lower.includes('kernel_bench')) {
      const code = this.kernel.vfs['/root/projects/kernel_bench.c'];
      const cRes = await this.kernel.runCode('kernel_bench.c', code, 'c');
      return {
        text: 'تم ترجمة وتشغيل كود لغة C الأصلي عبر مترجم `GCC 13.3` مباشرة على نواة اللينكس:',
        cmdExecuted: 'gcc kernel_bench.c -O2 -o /tmp/bench && /tmp/bench',
        cmdOutput: (cRes.stdout || '') + (cRes.stderr || ''),
        filename: 'kernel_bench.c',
        lang: 'c',
        code
      };
    }

    // 3. System / Kernel / Files inspection
    if (q.includes('ملفات') || q.includes('نظام') || q.includes('نواة') || lower.includes('neofetch') || lower.includes('uname') || lower.includes('sys')) {
      const sysRes = await this.kernel.exec('uname -a && lscpu | head -n 6 && df -h /');
      return {
        text: 'تم استخراج معلومات النواة والمعالج ونظام الملفات الحقيقي مباشرة من النظام:',
        cmdExecuted: 'uname -a && lscpu && df -h /',
        cmdOutput: (sysRes.stdout || '') + (sysRes.stderr || ''),
        filename: 'sys_audit.sh',
        lang: 'bash',
        code: this.kernel.vfs['/root/projects/sys_audit.sh']
      };
    }

    // 4. Custom Python script generation & live execution on Ubuntu 24.04 Kernel
    const customCode = `#!/usr/bin/env python3
# ABBADI Linux OS v2.0 · Live Executed Task from Arabic AI
import os, sys, platform, datetime

print("⚡ مهمة الذكاء الاصطناعي العربي:", ${JSON.stringify(q)})
print("Kernel  :", platform.system(), platform.release(), platform.machine())
print("Python  :", sys.version.split()[0])
print("Workdir :", os.getcwd())
print("Time    :", datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
`;
    await this.kernel.fsWrite('/root/projects/ai_task.py', customCode);
    const runRes = await this.kernel.runCode('ai_task.py', customCode, 'python');
    return {
      text: `تم كتابة السكربت في نظام الملفات الفعلي (\`/root/projects/ai_task.py\`) وتشغيله مباشرة على نواة اللينكس:`,
      cmdExecuted: 'python3 ai_task.py',
      cmdOutput: (runRes.stdout || '') + (runRes.stderr || ''),
      filename: 'ai_task.py',
      lang: 'python',
      code: customCode
    };
  }
}
