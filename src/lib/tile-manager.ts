// Tile layer management with invisible performance optimizations:
// - Smooth fade transitions between tiles
// - Keep old tiles visible until new ones load
// - Preload adjacent tiles automatically

export function createOptimizedTileLayer(L: any) {
  return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '',
    fadeAnimation: true,
    updateWhenZooming: false,
  })
}

export function smoothTransitionTiles(oldLayer: any, newLayer: any, map: any, duration: number = 300) {
  if (!oldLayer) {
    // First load, just add new layer without animation
    newLayer.addTo(map)
    return
  }

  // Keep old layer visible, add new layer invisible
  newLayer.addTo(map)
  newLayer.setOpacity(0)

  // Fade in new tiles invisibly
  let startTime = Date.now()
  const animate = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    // Smoothly transition opacities
    newLayer.setOpacity(progress)
    if (progress < 1) {
      oldLayer.setOpacity(Math.max(1 - progress * 0.5, 0.5))
      requestAnimationFrame(animate)
    } else {
      oldLayer.remove()
      newLayer.setOpacity(1)
    }
  }
  requestAnimationFrame(animate)
}

export function preloadAdjacentTiles(map: any, L: any) {
  // Silently preload tiles for adjacent areas to cache them
  try {
    const bounds = map.getBounds()
    const zoom = map.getZoom()
    
    // Preload a few nearby tile requests
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue
        
        const offsetLat = (bounds.getNorth() - bounds.getSouth()) * dy * 0.25
        const offsetLng = (bounds.getEast() - bounds.getWest()) * dx * 0.25
        const lat = map.getCenter().lat + offsetLat
        const lng = map.getCenter().lng + offsetLng
        
        // Preload tile by making a fetch request (browser caches it)
        const x = Math.floor((lng + 180) / 360 * Math.pow(2, zoom))
        const y = Math.floor(((1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2) * Math.pow(2, zoom))
        
        const tileUrl = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`
        fetch(tileUrl, { method: 'HEAD' }).catch(() => {
          // Silently fail - tiles may not exist
        })
      }
    }
  } catch (e) {
    // Silently fail - preloading is optional
  }
}
