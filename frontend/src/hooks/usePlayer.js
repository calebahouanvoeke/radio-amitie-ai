import { useState, useEffect, useRef, useCallback } from 'react'

const STREAM_URL = 'https://listen.radioking.com/radio/545489/stream/608162'
const TRACK_API  = 'https://api.radioking.io/widget/radio/radio-amitie1/track/current'

export function usePlayer() {
  const audioRef              = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [track,   setTrack]   = useState(null)
  const intervalRef           = useRef(null)

  // Charger les métadonnées
  const fetchTrack = useCallback(async () => {
    try {
      const res  = await fetch(TRACK_API)
      const data = await res.json()
      setTrack(data)
    } catch {}
  }, [])

  useEffect(() => {
    fetchTrack()
    intervalRef.current = setInterval(fetchTrack, 15000)
    return () => clearInterval(intervalRef.current)
  }, [fetchTrack])

  const play = useCallback(async () => {
    setLoading(true)
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(STREAM_URL)
        audioRef.current.preload = 'none'
        audioRef.current.oncanplay  = () => setLoading(false)
        audioRef.current.onerror    = () => { setLoading(false); setPlaying(false) }
        audioRef.current.onwaiting  = () => setLoading(true)
        audioRef.current.onplaying  = () => { setLoading(false); setPlaying(true) }
      }
      await audioRef.current.play()
      setPlaying(true)
    } catch { setLoading(false) }
  }, [])

  const pause = useCallback(() => {
    audioRef.current?.pause()
    setPlaying(false)
    setLoading(false)
  }, [])

  const toggle = useCallback(() => {
    playing ? pause() : play()
  }, [playing, play, pause])

  return { playing, loading, track, toggle, play, pause }
}
