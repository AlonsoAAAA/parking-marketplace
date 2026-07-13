'use client';
/**
 * Primitivas UI neo-brutalistas — solo presentación.
 * Basadas en la propuesta de diseño (estacionat-design).
 */
import React from 'react';
import Link from 'next/link';

type BtnVariant = 'primary' | 'secondary' | 'dark' | 'danger';

const BTN_BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl border-[3px] border-on-surface neo-brutal-shadow active-press font-sans font-extrabold uppercase tracking-wider cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed';

const BTN_VARIANTS: Record<BtnVariant, string> = {
  primary: 'bg-primary-container text-on-surface',
  secondary: 'bg-white text-on-surface',
  dark: 'bg-on-surface text-white',
  danger: 'bg-error text-white',
};

export function NeoButton({
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  return (
    <button
      className={`${BTN_BASE} ${BTN_VARIANTS[variant]} px-6 py-3.5 text-sm ${className}`}
      {...props}
    />
  );
}

export function NeoLinkButton({
  variant = 'primary',
  className = '',
  href,
  children,
}: {
  variant?: BtnVariant;
  className?: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`${BTN_BASE} ${BTN_VARIANTS[variant]} px-6 py-3.5 text-sm no-underline ${className}`}
    >
      {children}
    </Link>
  );
}

export function NeoCard({
  className = '',
  hover = false,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div
      className={`bg-white border-[3px] border-on-surface rounded-xl neo-brutal-shadow ${
        hover ? 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all duration-200' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

type BadgeColor = 'lime' | 'purple' | 'blue' | 'white' | 'dark' | 'red' | 'green';

const BADGE_COLORS: Record<BadgeColor, string> = {
  lime: 'bg-primary-container text-on-surface',
  purple: 'bg-tertiary text-white',
  blue: 'bg-secondary-container text-white',
  white: 'bg-white text-on-surface',
  dark: 'bg-on-surface text-white',
  red: 'bg-error text-white',
  green: 'bg-[#16a34a] text-white',
};

export function NeoBadge({
  color = 'lime',
  className = '',
  children,
}: {
  color?: BadgeColor;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-block px-3 py-1 rounded-full border-2 border-on-surface neo-brutal-shadow-sm font-sans font-extrabold text-[10px] uppercase tracking-widest ${BADGE_COLORS[color]} ${className}`}
    >
      {children}
    </span>
  );
}

export function NeoInput({
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full bg-white border-[3px] border-on-surface rounded-xl px-4 py-3.5 font-sans font-semibold text-sm text-on-surface placeholder:text-on-surface/35 focus:outline-none focus:neo-brutal-shadow transition-shadow ${className}`}
      {...props}
    />
  );
}

export function NeoTextarea({
  className = '',
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full bg-white border-[3px] border-on-surface rounded-xl px-4 py-3.5 font-sans font-semibold text-sm text-on-surface placeholder:text-on-surface/35 focus:outline-none focus:neo-brutal-shadow transition-shadow resize-none ${className}`}
      {...props}
    />
  );
}

export function NeoLabel({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block font-sans font-extrabold text-[11px] uppercase tracking-widest text-on-surface mb-2 ${className}`}>
      {children}
    </label>
  );
}

/** Título de sección: EXTRABOLD UPPERCASE con palabra opcional resaltada en lime */
export function NeoHeading({
  children,
  highlight,
  className = '',
  as: Tag = 'h2',
}: {
  children: React.ReactNode;
  highlight?: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3';
}) {
  return (
    <Tag className={`font-sans font-extrabold uppercase tracking-tight text-on-surface leading-tight ${className}`}>
      {children}
      {highlight && (
        <>
          {' '}
          <span className="bg-primary-container px-3 py-0.5 inline-block border-[3px] border-on-surface shadow-[3px_3px_0px_0px_#191c1d] -rotate-1">
            {highlight}
          </span>
        </>
      )}
    </Tag>
  );
}

/** Spinner de carga neo */
export function NeoSpinner({ label }: { label?: string }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-[3px] border-on-surface border-t-primary-container rounded-full animate-spin" />
      {label && (
        <p className="font-sans font-extrabold text-[11px] uppercase tracking-widest text-on-surface-variant">{label}</p>
      )}
    </div>
  );
}
