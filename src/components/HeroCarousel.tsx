import { useState, useEffect, useRef } from 'react'

const SLIDES = [
  '/images/1.jpg',
  '/images/2.jpg',
  '/images/3.jpg',
  '/images/4.jpg',
  '/images/5.jpg',
  '/images/6.jpg',
]

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startTimer = () => {
    stopTimer()
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length)
    }, 30000)
  }

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
  }

  useEffect(() => {
    startTimer()
    return stopTimer
  }, [])

  return (
    <section
      id="heroCarousel"
      aria-label="Photo carousel"
      onMouseEnter={stopTimer}
      onMouseLeave={startTimer}
    >
      {SLIDES.map((src, i) => (
        <img
          key={src}
          src={src}
          className={`carousel-slide${i === current ? ' active' : ''}`}
          alt=""
          aria-hidden="true"
          onLoad={(e) => e.currentTarget.classList.add('loaded')}
        />
      ))}
    </section>
  )
}
