import React, { useState } from 'react';
import { KeyRound, Send, CheckCircle2, AlertCircle, Sparkles, ExternalLink, ShieldCheck } from 'lucide-react';
import { verifyActivationCode, DEFAULT_TELEGRAM_CHANNEL } from '../services/activation';
import { ActivationData } from '../types';

interface ActivationModalProps {
  isOpen: boolean;
  onActivated: (data: ActivationData) => void;
}

export const ActivationModal: React.FC<ActivationModalProps> = ({ isOpen, onActivated }) => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code.trim()) {
      setErrorMsg('الكود غير صالح أو غير صحيح');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const result = await verifyActivationCode(code);
      if (result.success) {
        setSuccessMsg(result.message || 'تم التفعيل بنجاح! جاري تحويلك...');
        setTimeout(() => {
          onActivated({
            isActivated: true,
            code: code.trim().toUpperCase(),
            activatedAt: new Date().toISOString(),
            tier: result.tier || 'VIP Creator Pro',
          });
        }, 700);
      } else {
        setErrorMsg(result.message);
      }
    } catch {
      setErrorMsg('حدث خطأ أثناء الاتصال بالخادم. حاول مجدداً.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#111827] border border-slate-700/80 rounded-2xl shadow-2xl p-6 md:p-8 text-right overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between pb-5 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-wide">
                  تفعيل منصة NABMEDIA STUDIO
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  أدخل كود التفعيل للوصول إلى أدوات المونتاج
                </p>
              </div>
            </div>
            <span className="text-xs font-mono px-2 py-1 bg-purple-950/60 text-purple-300 border border-purple-800/40 rounded-md">
              PRO
            </span>
          </div>

          {/* Telegram Channel Callout - The Official Source for Users */}
          <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-blue-950/40 via-purple-950/30 to-slate-900 border border-blue-500/25">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-right">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-300">
                  <Send className="w-4 h-4 text-blue-400" />
                  <span>انضم لقناة التلجرام لأخذ الكود:</span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  يجب الدخول إلى القناة <strong className="text-white font-mono">t.me/nabmediastudio</strong> للحصول على كود التفعيل النشط.
                </p>
              </div>

              <a
                href={DEFAULT_TELEGRAM_CHANNEL}
                target="_blank"
                rel="noreferrer noopener"
                className="shrink-0 flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-sm transition-colors"
              >
                <span>t.me/nabmediastudio</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Activation Form */}
          <form onSubmit={handleVerify} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                كود التفعيل (Activation Code)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="أدخل كود التفعيل هنا..."
                  disabled={isLoading}
                  autoFocus
                  className="w-full px-4 py-3 bg-[#0d121d] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-mono tracking-wider text-center text-base"
                />
                <KeyRound className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500 pointer-events-none" />
              </div>
            </div>

            {/* Error State with Telegram button */}
            {errorMsg && (
              <div className="p-3.5 bg-red-950/60 border border-red-800/80 rounded-xl space-y-2.5 text-right">
                <div className="flex items-center gap-2.5 text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span className="leading-relaxed font-semibold">{errorMsg}</span>
                </div>
                <a
                  href={DEFAULT_TELEGRAM_CHANNEL}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>انضم لقناة التلجرام لأخذ الكود (t.me/nabmediastudio)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-950/50 border border-emerald-800/60 rounded-xl flex items-center gap-2.5 text-emerald-300 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>تفعيل المنصة والدخول</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Persistence Info */}
          <p className="text-center text-[11px] text-slate-500 mt-5">
            يتم حفظ التفعيل في متصفحك لضمان الدخول التلقائي في المرات القادمة دون الحاجة لإعادة الكود.
          </p>
        </div>
      </div>
    </div>
  );
};
