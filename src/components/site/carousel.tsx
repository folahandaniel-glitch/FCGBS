"use client";

/* eslint-disable @next/next/no-img-element */
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cx } from "../ui/primitives";

export interface CarouselSlide {
  title: string;
  text: string;
  link: string;
  linkLabel: string;
  imageUrl?: string | null;
  tag?: string;
}

/**
 * Animated, middle-sized announcement carousel. Slides come from Admin → Website & Content → Homepage carousel
 * and from published announcements flagged "show in carousel". Pauses on hover/focus, honours reduced motion.
 */
export function Carousel({ slides, seconds }: { slides: CarouselSlide[]; seconds: number }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const current = count ? index % count : 0;

  useEffect(() => {
    if (paused || count < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), Math.min(30, Math.max(3, seconds)) * 1000);
    return () => window.clearInterval(id);
  }, [paused, count, seconds]);

  if (!count) return null;
  const go = (step: number) => setIndex((i) => (((i + step) % count) + count) % count);

  return (
    <section aria-roledescription="carousel" aria-label="Announcements" className="relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="grid overflow-hidden rounded-3xl bg-navy-900 shadow-lift ring-1 ring-gold-400/30">
        {slides.map((s, i) => {
          const active = i === current;
          return (
            <div
              key={i}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              aria-hidden={!active}
              className={cx("relative col-start-1 row-start-1 grid min-h-[17rem] items-stretch transition-all duration-700 ease-out motion-reduce:transition-none sm:min-h-[19rem] md:grid-cols-[1.15fr_1fr]", active ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-8 opacity-0")}
            >
              <div className="flex flex-col justify-center gap-3 p-6 sm:p-9">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-400">{s.tag ?? "Announcement"}</p>
                <h2 className="font-display text-2xl font-bold leading-tight text-white sm:text-3xl">{s.title}</h2>
                {s.text && <p className="max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">{s.text}</p>}
                {s.link && s.linkLabel && (
                  <Link href={s.link} tabIndex={active ? 0 : -1} className="mt-1 inline-flex w-fit items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-bold text-navy-900 hover:bg-gold-400">
                    {s.linkLabel} <ArrowRight className="size-4" aria-hidden />
                  </Link>
                )}
              </div>
              <div className="relative hidden md:block">
                {s.imageUrl ? (
                  <img src={s.imageUrl} alt="" loading={i === 0 ? "eager" : "lazy"} decoding="async" className="absolute inset-0 size-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(220,185,74,0.28),transparent_55%),linear-gradient(135deg,#123573,#081634)]" aria-hidden />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-navy-900 via-navy-900/20 to-transparent" aria-hidden />
              </div>
            </div>
          );
        })}
      </div>
      {count > 1 && (
        <>
          <div className="mt-3 flex items-center justify-center gap-3">
            <button type="button" aria-label="Previous slide" onClick={() => go(-1)} className="grid size-8 place-items-center rounded-full bg-white text-navy-800 ring-1 ring-line hover:bg-royal-50">
              <ChevronLeft className="size-4" />
            </button>
            <div className="flex gap-2">
              {slides.map((_, i) => (
                <button key={i} type="button" aria-label={`Show slide ${i + 1}`} aria-current={i === current} onClick={() => setIndex(i)} className={cx("h-2 rounded-full transition-all duration-300", i === current ? "w-7 bg-royal-600" : "w-2 bg-navy-800/25 hover:bg-navy-800/45")} />
              ))}
            </div>
            <button type="button" aria-label="Next slide" onClick={() => go(1)} className="grid size-8 place-items-center rounded-full bg-white text-navy-800 ring-1 ring-line hover:bg-royal-50">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </>
      )}
    </section>
  );
}
