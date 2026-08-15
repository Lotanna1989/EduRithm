import { ArrowLeft, Compass } from 'lucide-react';
import { Link } from 'wouter';
import { Brand } from '@/components/shared';

export default function NotFound() {
  return <div className="noise grid min-h-[100dvh] place-items-center bg-[#f7f3ea] px-5"><div className="w-full max-w-[560px]"><Brand /><div className="mt-16"><p className="eyebrow">Lost in the studio</p><h1 className="mt-3 font-display text-6xl font-bold tracking-[-.05em] text-[#162239] sm:text-8xl">404<span className="text-[#d95e49]">.</span></h1><p className="mt-5 max-w-md text-lg leading-relaxed text-[#687386]">This page wandered off between two commits. The good news: your work is still here.</p><Link href="/" className="btn-dark mt-8" data-testid="link-return-home"><ArrowLeft size={16} /> Return to studio</Link></div><div className="mt-20 flex items-center gap-3 text-xs text-[#7b8491]"><Compass size={15} /> EduRithm keeps the useful things close.</div></div></div>;
}