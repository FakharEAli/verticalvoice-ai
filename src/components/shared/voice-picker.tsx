'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, Loader2, Pause, Play, Search } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { VoiceLanguageOption, VoiceSummary } from '@/lib/voices/catalog';

interface VoicePickerProps {
  /** The currently selected catalog voice id, or null when none is chosen. */
  value: string | null;
  /** Called with the real catalog voiceId when a voice card is selected. */
  onChange: (voiceId: string) => void;
  /**
   * CSS colour string (e.g. `var(--vertical-healthcare)`) used to tint the
   * selected card, mirroring the onboarding workspace accent. Falls back to the
   * brand accent.
   */
  accent?: string;
}

const ALL_LANGUAGES = 'all';

/**
 * Controlled voice picker backed by the live Ultravox catalog.
 *
 * Fetches `/api/v1/voices` (with optional search + language filters) and plays
 * real MP3 samples from `/api/v1/voices/[voiceId]/preview` through a SINGLE
 * shared `<audio>` element — never one player per card — copying the pattern in
 * `dashboard/agent/voice-studio.tsx`. Selecting a card reports the real catalog
 * id via `onChange`.
 */
export function VoicePicker({ value, onChange, accent = 'var(--brand)' }: VoicePickerProps) {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState<string>(ALL_LANGUAGES);

  const [voices, setVoices] = useState<VoiceSummary[]>([]);
  const [languages, setLanguages] = useState<VoiceLanguageOption[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);

  // One <audio> for the whole list. Two hundred-odd per-row players would be
  // both slow and impossible to keep mutually exclusive.
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Debounced so typing in the search box does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    // Ignores responses from superseded requests, so a slow early query cannot
    // land after a fast later one and show the wrong list.
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set('search', search.trim());
        if (language !== ALL_LANGUAGES) params.set('language', language);

        const res = await fetch(`/api/v1/voices?${params.toString()}`);
        const body = await res.json();
        if (!active) return;

        if (!res.ok) {
          setLoadError(body.error ?? 'The list of voices could not be loaded.');
          setVoices([]);
          return;
        }

        setLoadError(null);
        setVoices(body.data.voices);
        setTotal(body.data.total);
        // The API always returns every language, not just those in the current
        // result, so the filter never collapses to the option just chosen.
        if (body.data.languages.length > 0) setLanguages(body.data.languages);
      } catch {
        if (active) {
          setLoadError('The list of voices could not be loaded.');
          setVoices([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [search, language]);

  // Stop audio when the component unmounts, so leaving the step does not leave a
  // sample playing over the rest of the wizard.
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio?.pause();
    };
  }, []);

  const stopPlayback = useCallback(() => {
    audioRef.current?.pause();
    setPlayingVoiceId(null);
    setLoadingVoiceId(null);
  }, []);

  const handlePreview = useCallback(
    async (voice: VoiceSummary) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (playingVoiceId === voice.voiceId) {
        stopPlayback();
        return;
      }

      audio.pause();
      setPlayingVoiceId(null);
      setLoadingVoiceId(voice.voiceId);

      // Proxied rather than linked directly: Ultravox serves its sample clips
      // as text/plain, which browsers refuse to play.
      audio.src = `/api/v1/voices/${encodeURIComponent(voice.voiceId)}/preview`;

      try {
        await audio.play();
        setLoadingVoiceId(null);
        setPlayingVoiceId(voice.voiceId);
      } catch {
        setLoadingVoiceId(null);
        setPlayingVoiceId(null);
        toast.error(`The sample for ${voice.name} could not be played.`);
      }
    },
    [playingVoiceId, stopPlayback]
  );

  const languageLabel = useMemo(() => {
    if (language === ALL_LANGUAGES) return null;
    return languages.find((l) => l.code === language)?.label ?? language;
  }, [language, languages]);

  const isFiltered = search.trim().length > 0 || language !== ALL_LANGUAGES;

  const selectedStyle: CSSProperties = {
    borderColor: accent,
    backgroundColor: `color-mix(in srgb, ${accent} 8%, transparent)`,
    boxShadow: `0 0 0 1px ${accent}`,
  };

  return (
    <div className="space-y-3">
      {/* Rendered once, off-screen, and reused for every card. */}
      <audio
        ref={audioRef}
        className="hidden"
        preload="none"
        onEnded={() => setPlayingVoiceId(null)}
        onError={() => {
          setLoadingVoiceId(null);
          setPlayingVoiceId(null);
        }}
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or description"
            aria-label="Search voices"
            className="pl-9"
          />
        </div>
        <Select value={language} onValueChange={(v) => setLanguage(v ?? ALL_LANGUAGES)}>
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="All languages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_LANGUAGES}>All languages</SelectItem>
            {languages.map((option) => (
              <SelectItem key={option.code} value={option.code}>
                {option.label} ({option.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {total !== null && (
        <p className="text-xs text-muted-foreground">
          {isFiltered
            ? `${voices.length.toLocaleString()} of ${total.toLocaleString()} voices`
            : `${total.toLocaleString()} voices available`}
        </p>
      )}

      <div className="max-h-[28rem] overflow-y-auto rounded-lg ring-1 ring-foreground/10 p-2">
        {loading && voices.length === 0 ? (
          <p className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading voices...
          </p>
        ) : loadError ? (
          <p className="p-6 text-sm text-destructive">{loadError}</p>
        ) : voices.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            No voices match
            {search.trim() ? ` "${search.trim()}"` : ''}
            {languageLabel ? ` in ${languageLabel}` : ''}. Try a different search
            or language.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {voices.map((voice) => {
              const selected = voice.voiceId === value;
              const isPlaying = playingVoiceId === voice.voiceId;
              const isLoadingSample = loadingVoiceId === voice.voiceId;

              return (
                <li key={voice.voiceId}>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-pressed={selected}
                    aria-label={`Select the ${voice.name} voice`}
                    onClick={() => onChange(voice.voiceId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onChange(voice.voiceId);
                      }
                    }}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all hover:-translate-y-0.5 hover:shadow-sm',
                      !selected && 'hover:border-foreground/20'
                    )}
                    style={selected ? selectedStyle : undefined}
                  >
                    <button
                      type="button"
                      disabled={!voice.hasPreview || isLoadingSample}
                      aria-label={
                        voice.hasPreview
                          ? isPlaying
                            ? `Stop the sample for ${voice.name}`
                            : `Play a sample of ${voice.name}`
                          : `No sample available for ${voice.name}`
                      }
                      onClick={(e) => {
                        // Do not let the play button also toggle card selection.
                        e.stopPropagation();
                        handlePreview(voice);
                      }}
                      className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border bg-background text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isLoadingSample ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : isPlaying ? (
                        <Pause className="size-4" />
                      ) : (
                        <Play className="size-4" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{voice.name}</span>
                        {selected && (
                          <Badge
                            className="gap-1 border-transparent"
                            style={{
                              backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`,
                              color: accent,
                            }}
                          >
                            <Check className="size-3" />
                            Selected
                          </Badge>
                        )}
                        {isPlaying && (
                          <span className="text-xs text-muted-foreground">
                            Playing
                          </span>
                        )}
                      </div>
                      {voice.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {voice.description}
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <Badge variant="outline" className="text-xs">
                          {voice.languageLabel}
                        </Badge>
                        {voice.provider && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {voice.provider}
                          </Badge>
                        )}
                        {!voice.hasPreview && (
                          <span className="text-xs text-muted-foreground">
                            No sample available
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
