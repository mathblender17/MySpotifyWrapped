import type { Slide } from '../story/player';
import { esc, slide } from './fmt';
import './worlds/i.css';

let uid = 0;

// World I (sumi ink), like Fuji: the fortune is brushed inside an ensō on rice paper, sealed in red.
export const omikuji: Slide = ({ stats }) => {
  const p = stats!.personality!;
  const f = stats!.fortune!;
  const id = ++uid; // two slides can be on stage during a transition: SVG ids must not clash
  return slide('omi', `<div class="hd" data-beat="1">音楽みくじ · ${stats!.year}</div>
    <svg class="enso" viewBox="0 0 100 100" aria-hidden="true" data-beat="1">
      <filter id="brush-${id}" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="4"/></filter>
      <circle cx="50" cy="50" r="40" fill="none" stroke="#141414" stroke-width="8" stroke-linecap="round" stroke-dasharray="230 30" transform="rotate(-70 50 50)" filter="url(#brush-${id})"/>
    </svg>
    <div class="kuji" data-beat="1" aria-hidden="true"><svg viewBox="0 0 44 44"><path d="M22 3l16 9v20l-16 9-16-9V12z" fill="#f3eee2" stroke="#141414" stroke-width="3" stroke-linejoin="round"/><path d="M22 3v38M6 12l32 20M38 12L6 32" stroke="#141414" stroke-width="1" opacity=".35"/><circle cx="22" cy="22" r="5" fill="#c8102e"/></svg></div>
    <div class="hero" data-beat="2" data-fx="stamp">${esc(f.jp)}</div>
    <div class="en" data-beat="2">${esc(f.en)}</div>
    <div class="pj" data-beat="3">${esc(p.jp)}</div>
    <div class="pn" data-beat="3">${esc(p.name)}</div>
    <div class="ln" data-beat="4">${esc(p.line)}</div>
    <i class="seal" data-beat="4" data-fx="stamp">音楽</i>`);
};
