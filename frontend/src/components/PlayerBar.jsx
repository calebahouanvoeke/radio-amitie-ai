import { Play, Pause, Headphones, Radio } from 'lucide-react'

export default function PlayerBar({ playing, loading, track, onToggle }) {
  const isProgram = !track?.artist
  const cover     = track?.cover_url

  return (
    <div className="player-bar">
      {/* Artwork */}
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-100 flex-shrink-0 flex items-center justify-center">
        {cover
          ? <img src={cover} alt="" className="w-full h-full object-cover" />
          : isProgram
            ? <Radio className="w-5 h-5 text-zinc-400" />
            : <Headphones className="w-5 h-5 text-zinc-400" />
        }
      </div>

      {/* Infos titre */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-zinc-900 truncate">
          {track?.title || 'Radio Amitié 99.2 FM'}
        </div>
        <div className="text-xs text-zinc-400 truncate flex items-center gap-1.5">
          {playing && <span className="live-dot" />}
          {playing
            ? (track?.artist || 'En direct')
            : 'Cliquez sur lecture pour écouter'}
        </div>
      </div>

      {/* Bouton Play/Pause */}
      <div className="flex flex-col items-center gap-0.5">
        <button
          onClick={onToggle}
          disabled={loading}
          className="w-10 h-10 rounded-full bg-zinc-900 text-white flex items-center justify-center hover:bg-zinc-700 active:scale-95 transition-all disabled:opacity-50"
          aria-label={playing ? 'Mettre en pause' : 'Écouter en direct'}
        >
          {loading
            ? <span className="spin w-4 h-4" />
            : playing
              ? <Pause className="w-4 h-4" fill="white" />
              : <Play className="w-4 h-4 ml-0.5" fill="white" />
          }
        </button>
        <span className="text-[10px] text-zinc-400 font-medium">
          {playing ? 'En direct' : 'Écouter'}
        </span>
      </div>
    </div>
  )
}
