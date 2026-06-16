import { useState, useEffect, useRef } from 'react';
import { StoreBanner } from '@/types/storefront';
import { ChevronLeft, ChevronRight, Volume2, VolumeX, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  banners: StoreBanner[];
  primaryColor: string;
  secondaryColor: string;
}

export default function StoreCarousel({ banners, primaryColor, secondaryColor }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const slideDuration = 6000; // 6 seconds per slide
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef<number | null>(null);

  // Filter and sort banners
  const activeBanners = [...banners].sort((a, b) => a.sort_order - b.sort_order);

  // Handle slide transitions
  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    setProgress(0);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
    setProgress(0);
  };

  const goToSlide = (idx: number) => {
    setCurrentIndex(idx);
    setProgress(0);
  };

  // Manage video play/pause states based on active index
  useEffect(() => {
    activeBanners.forEach((banner, idx) => {
      const videoEl = videoRefs.current[banner.id];
      if (videoEl) {
        if (idx === currentIndex) {
          // Play current video
          videoEl.play().catch((err) => {
            console.log('Video autoplay blocked or interrupted:', err);
          });
        } else {
          // Pause and reset other videos
          videoEl.pause();
          videoEl.currentTime = 0;
        }
      }
    });

    // Reset video playing state when slide changes
    const currentBanner = activeBanners[currentIndex];
    if (currentBanner && currentBanner.type === 'video') {
      setIsVideoPlaying(true);
    } else {
      setIsVideoPlaying(false);
    }
  }, [currentIndex, activeBanners]);

  // Autoplay and progress bar logic
  useEffect(() => {
    if (activeBanners.length <= 1) return;

    const currentBanner = activeBanners[currentIndex];
    const shouldPause = isHovered || (currentBanner.type === 'video' && isVideoPlaying);

    if (shouldPause) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      return;
    }

    const intervalTime = 50; // update progress every 50ms
    const steps = slideDuration / intervalTime;
    let currentStep = (progress / 100) * steps;

    progressIntervalRef.current = window.setInterval(() => {
      currentStep += 1;
      const currentProgress = (currentStep / steps) * 100;
      
      if (currentProgress >= 100) {
        setProgress(0);
        nextSlide();
      } else {
        setProgress(currentProgress);
      }
    }, intervalTime);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [currentIndex, isHovered, isVideoPlaying, activeBanners, progress]);

  if (activeBanners.length === 0) return null;

  return (
    <div
      className="relative w-full h-64 sm:h-80 md:h-[350px] lg:h-[400px] rounded-2xl overflow-hidden group shadow-xl border border-border/40 mb-8 select-none transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Slides Container */}
      <div className="relative w-full h-full bg-zinc-950">
        {activeBanners.map((banner, idx) => {
          const isActive = idx === currentIndex;
          
          return (
            <div
              key={banner.id}
              className={`absolute inset-0 w-full h-full transition-all duration-1000 ease-in-out ${
                isActive 
                  ? 'opacity-100 scale-100 z-10' 
                  : 'opacity-0 scale-105 pointer-events-none z-0'
              }`}
            >
              {/* Media Element */}
              {banner.type === 'image' ? (
                <img
                  src={banner.url}
                  alt={banner.title || ''}
                  className="w-full h-full object-cover object-center"
                  loading="lazy"
                />
              ) : (
                <div className="relative w-full h-full">
                  <video
                    ref={(el) => {
                      videoRefs.current[banner.id] = el;
                    }}
                    src={banner.url}
                    className="w-full h-full object-cover"
                    muted={isMuted}
                    loop
                    playsInline
                    onPlay={() => setIsVideoPlaying(true)}
                    onPause={() => setIsVideoPlaying(false)}
                    onEnded={() => {
                      setIsVideoPlaying(false);
                      nextSlide();
                    }}
                  />
                  {/* Mute/Unmute Float Button */}
                  {isActive && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMuted(!isMuted);
                      }}
                      className="absolute top-4 right-4 z-30 p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-black/60 transition-all hover:scale-105"
                      title={isMuted ? 'Activar sonido' : 'Silenciar'}
                    >
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              )}

              {/* Glassmorphic dark gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/15 z-10 pointer-events-none" />

              {/* Text content overlay */}
              {(banner.title || banner.description) && (
                <div 
                  className={`absolute bottom-8 left-6 right-6 md:left-10 md:bottom-10 max-w-xl bg-black/35 backdrop-blur-md border border-white/10 rounded-2xl p-5 md:p-6 text-white space-y-2.5 z-20 shadow-2xl transition-all duration-700 delay-200 ${
                    isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                  }`}
                >
                  {banner.title && (
                    <h3 className="text-lg md:text-2xl font-black tracking-tight leading-tight">
                      {banner.title}
                    </h3>
                  )}
                  {banner.description && (
                    <p className="text-xs md:text-sm text-zinc-300 font-medium leading-relaxed">
                      {banner.description}
                    </p>
                  )}
                  
                  {banner.link && (
                    <div className="pt-1">
                      <a
                        href={banner.link}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow-md active:scale-95 text-white"
                        style={{
                          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                        }}
                      >
                        Ver más
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation Arrows */}
      {activeBanners.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white hover:bg-black/50 transition-all hover:scale-105 active:scale-95 opacity-0 group-hover:opacity-100 duration-300"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white hover:bg-black/50 transition-all hover:scale-105 active:scale-95 opacity-0 group-hover:opacity-100 duration-300"
            aria-label="Siguiente"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Progress indicators & dots */}
      {activeBanners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/25 backdrop-blur-xs">
          {activeBanners.map((_, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={idx}
                onClick={() => goToSlide(idx)}
                className="relative h-1.5 rounded-full transition-all duration-300 focus:outline-none"
                style={{
                  width: isActive ? '24px' : '6px',
                  backgroundColor: isActive ? undefined : 'rgba(255, 255, 255, 0.4)',
                }}
                aria-label={`Ir al banner ${idx + 1}`}
              >
                {isActive && (
                  <div
                    className="absolute inset-0 h-full rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: primaryColor,
                      width: `${progress}%`,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
