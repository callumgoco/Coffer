import { useEffect, useRef, useState } from 'react'

export function useInView<T extends HTMLElement>(options?: IntersectionObserverInit): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setInView(true)
          // Once visible, we can stop observing to avoid repeated state changes
          observer.unobserve(entry.target)
        }
      })
    }, options ?? { threshold: 0.15, rootMargin: '0px 0px -10% 0px' })

    observer.observe(element)
    return () => observer.disconnect()
  }, [options])

  return [ref, inView]
}

export default useInView


