import React from 'react';

// ═══════════════════════════════════════════════════════════
// Componente Reutilizable para Mostrar Logos de Plataformas
// ═══════════════════════════════════════════════════════════

interface PlatformLogoProps {
  platform: string;
  emojiFallback?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function getPlatformLogoDetails(platform: string): { logoUrl?: string; bgClass?: string } | null {
  const name = platform.toLowerCase().trim();
  const base = import.meta.env.BASE_URL || '/';
  
  if (name.includes('netflix')) {
    // Círculo negro con la N roja oficial
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Netflix-new-icon.png', bgClass: 'bg-black' };
  }
  if (name.includes('amazon') || name.includes('prime')) {
    // Fondo blanco con el logo azul de Prime Video
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/90/Prime_Video_logo_%282024%29.svg', bgClass: 'bg-white p-1' };
  }
  if (name.includes('claro')) {
    // Fondo blanco con el logo rojo de Claro
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0c/Claro.svg', bgClass: 'bg-white p-1.5' };
  }
  if (name.includes('paramount')) {
    // Logo oficial de Paramount+ (subido y adaptado localmente)
    return { logoUrl: `${base}paramount-logo.jpg`, bgClass: 'bg-white p-1' };
  }
  if (name.includes('hbo max') || name.includes('hbomax')) {
    // Logo oficial de HBO Max (morado clásico)
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/17/HBO_Max_Logo.svg', bgClass: 'bg-[#3c0080] p-1' };
  }
  if (name.includes('max')) {
    // Logo oficial de Max (azul moderno)
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Max_logo.svg', bgClass: 'bg-[#002BE7] p-1.5' };
  }
  if (name.includes('hbo')) {
    // Logo de HBO (morado clásico como fallback de HBO Max)
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/17/HBO_Max_Logo.svg', bgClass: 'bg-[#3c0080] p-1' };
  }
  if (name.includes('disney') || name.includes('star')) {
    // Fondo azul marino de Disney+
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg', bgClass: 'bg-[#0b133a] p-1.5' };
  }
  if (name.includes('crunchyroll') || name.includes('crunchy')) {
    // Fondo blanco con el ojo naranja de Crunchyroll
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d6/Crunchyroll.svg', bgClass: 'bg-white p-1' };
  }
  if (name.includes('spotify')) {
    // Círculo Spotify oficial
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg', bgClass: 'bg-black p-1' };
  }
  if (name.includes('plex')) {
    // Fondo negro y logo naranja de Plex
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Plex_logo_2022.svg', bgClass: 'bg-[#1f2326] p-1' };
  }
  if (name.includes('flujo')) {
    // Fondo blanco con el logo oficial de Flujo TV
    return { logoUrl: `${base}flujo-logo.jpg`, bgClass: 'bg-white p-1' };
  }
  if (name.includes('iptv') || name.includes('smarters')) {
    // Fondo morado con ícono blanco de Smart TV (IPTV Smarters style)
    return { bgClass: 'bg-[#4d2d8f]' }; 
  }
  if (name.includes('vix')) {
    // Fondo blanco con logo naranja de ViX
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/ViX_Logo.svg', bgClass: 'bg-white p-1' };
  }
  if (name.includes('canva')) {
    // Fondo Canva degradado o blanco
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Canva_logo.svg', bgClass: 'bg-white p-1' };
  }
  if (name.includes('capcut')) {
    // Fondo blanco con logo negro de CapCut
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d8/CapCut_logo.svg', bgClass: 'bg-white p-1.5' };
  }
  if (name.includes('microsoft') || name.includes('office') || name.includes('365') || name.includes('m365')) {
    // Fondo blanco con logo de Microsoft 365
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/32/Microsoft_365_logo.svg', bgClass: 'bg-white p-1' };
  }
  if (name.includes('gemini') || name.includes('google')) {
    // Fondo oscuro oficial con el logo brillante de Google Gemini
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1d/Google_Gemini_icon_2025.svg', bgClass: 'bg-[#1e1f20] p-1.5' };
  }
  if (name.includes('chatgpt') || name.includes('openai') || name.includes('gpt')) {
    // Círculo verde de ChatGPT
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg', bgClass: 'bg-[#10a37f] p-1.5' };
  }
  if (name.includes('apple')) {
    // Círculo negro con logo de Apple
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f7/Apple_TV_logo.svg', bgClass: 'bg-black p-1.5' };
  }
  if (name.includes('megatv') || name.includes('mega tv') || name.includes('mega')) {
    // Círculo azul y blanco de MegaTV
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Mega_Televisi%C3%B3n_logo.svg', bgClass: 'bg-white p-1' };
  }
  if (name.includes('youtube')) {
    // Fondo blanco con botón de reproducción de YouTube
    return { logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/YouTube_play_button_icon_%282013%E2%80%932017%29.svg', bgClass: 'bg-white p-1' };
  }

  return null;
}

export default function PlatformLogo({
  platform,
  emojiFallback = '📺',
  size = 'md',
  className = '',
}: PlatformLogoProps) {
  const details = getPlatformLogoDetails(platform);
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-2xl',
    lg: 'w-16 h-16 text-3xl',
  };

  const imgSizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  const wrapperClass = `rounded-full flex items-center justify-center shrink-0 shadow-md border border-white/10 overflow-hidden select-none ${sizeClasses[size]} ${details?.bgClass || 'bg-white/5'} ${className}`;

  if (details) {
    if (details.logoUrl) {
      return (
        <div className={wrapperClass}>
          <img
            src={details.logoUrl}
            alt={platform}
            className={`${imgSizeClasses[size]} object-contain`}
            onError={(e) => {
              // Si falla el logo externo, remover la imagen e insertar el emoji fallback
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.innerHTML = `<span class="leading-none">${emojiFallback}</span>`;
              }
            }}
          />
        </div>
      );
    } else {
      // Caso IPTV o fallbacks de SVG personalizados (IPTV Smarters style)
      return (
        <div className={wrapperClass}>
          <svg
            className={`${imgSizeClasses[size]} text-white fill-none stroke-current`}
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
            <polyline points="17 2 12 7 7 2" />
          </svg>
        </div>
      );
    }
  }

  // Si no se encuentra mapeado en el diccionario, usar el emoji con un gradiente elegante
  return (
    <div className={`${wrapperClass} bg-gradient-to-br from-white/15 to-white/5`}>
      <span className="leading-none">{emojiFallback}</span>
    </div>
  );
}
