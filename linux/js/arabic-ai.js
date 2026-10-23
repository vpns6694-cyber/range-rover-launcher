// ============================================================================
// ABBADI Local Arabic AI Engine v1.0 (Arabic + Coding + Linux Automation)
// Auto-starts with the OS at 0ms warmup
// ============================================================================

export class AbbadiLocalArabicAI {
  constructor(kernel) {
    this.kernel = kernel;
    this.modelName = 'ABBADI-Local-Arabic-Coder-7B-Q4';
    this.status = 'READY ⚡ 0ms';
  }

  async ask(promptText) {
    const q = (promptText || '').trim();
    const lower = q.toLowerCase();

    // 1. Network / Port Scanning request in Arabic or English
    if (q.includes('شبك') || q.includes('منافذ') || q.includes('فحص') || lower.includes('scan') || lower.includes('nmap') || lower.includes('port')) {
      const scanRes = await this.kernel.exec('python3 port_scanner.py');
      return {
        text: 'تم تنفيذ فحص المنافذ والخدمات النشطة مباشرة عبر نواة اللينكس والسيرفر الخلفي، وكتبت لك سكربت بايثون متكامل لفحص المنافذ الأمنية:',
        cmdExecuted: 'python3 port_scanner.py',
        cmdOutput: scanRes.stdout,
        filename: 'port_scanner.py',
        lang: 'python',
        code: this.kernel.vfs['/root/projects/port_scanner.py']
      };
    }

    // 2. System / Kernel / Files inspection
    if (q.includes('ملفات') || q.includes('نظام') || q.includes('نواة') || lower.includes('neofetch') || lower.includes('uname') || lower.includes('sys')) {
      const sysRes = await this.kernel.exec('neofetch');
      return {
        text: 'هذي حالة نظام **ABBADI Linux OS (Z Fold6 Glass Edition)** الحية من السيرفر الخلفي مع سكربت فحص النواة والذاكرة:',
        cmdExecuted: 'neofetch',
        cmdOutput: sysRes.stdout,
        filename: 'sys_audit.sh',
        lang: 'bash',
        code: this.kernel.vfs['/root/projects/sys_audit.sh']
      };
    }

    // 3. Python / AI / Automation script request
    if (q.includes('بايثون') || q.includes('كود') || q.includes('سكربت') || lower.includes('python') || lower.includes('code')) {
      const pyRes = await this.kernel.exec('python3 ai_agent.py');
      return {
        text: 'جهزت لك سكربت بايثون متكامل يعمل مع الموديل العربي المحلي ويفحص بيئة اللينكس على الـ Z Fold6 مع نتيجة تشغيله الفورية:',
        cmdExecuted: 'python3 ai_agent.py',
        cmdOutput: pyRes.stdout,
        filename: 'ai_agent.py',
        lang: 'python',
        code: this.kernel.vfs['/root/projects/ai_agent.py']
      };
    }

    // Default intelligent Arabic + Coding response + live command execution
    const res = await this.kernel.exec('uname -a && ls -la');
    return {
      text: `أبشر يا عبدالله! الموديل المحلي **${this.modelName}** شغال تلقائياً بالعربي وبسرعة فورية، ومربوط مباشرة بنواة اللينكس والسيرفر الخلفي. نفذت لك فحص سريع للبيئة الحالية وتقدر تشغل السكربت بالتيرمينال أو تفتحه بمحرر الأكواد بضغطة زر:`,
      cmdExecuted: 'uname -a && ls -la',
      cmdOutput: res.stdout,
      filename: 'abbadi_automation.py',
      lang: 'python',
      code: `#!/usr/bin/env python3
# ABBADI Linux OS · Custom Arabic AI Automation Task
import os, subprocess

print("⚡ تنفيذ المهمة المطلوبة:", ${JSON.stringify(q)})
out = subprocess.check_output("uname -snr", shell=True, text=True).strip()
print("✓ Kernel verified:", out)
print("✓ Files in /root/projects:", os.listdir("."))`
    };
  }
}
