import { Link, Outlet } from 'react-router-dom'
import HeroCarousel from './HeroCarousel'

const TEXT_SIZES: Record<string, string> = { small: '14px', medium: '15px', large: '17px' }

export default function Layout() {
  const handleTextSize = (size: string) => {
    document.documentElement.style.fontSize = TEXT_SIZES[size]
  }

  return (
    <div className="layout">
      <a href="#cardContainer" className="skip-link">Skip to results</a>
      <header className="site-masthead" aria-label="Site header">
        <div className="site-masthead__inner">
          <img src="/images/Fork Icon Illustration.png" alt="" aria-hidden="true" className="site-masthead__icon" />
          <hgroup>
            <h1>Fork in the road</h1>
            <p>Your personal travel guide</p>
          </hgroup>
        </div>
      </header>
      <HeroCarousel />
      <Outlet />
      <footer className="site-footer" aria-label="Site footer">
        <div className="site-footer__inner">
          <div>
            <span className="site-footer__name">Fork in the road</span>
            <p className="site-footer__tagline">Find places by distance from your location</p>
            <div className="text-resizer">
              <span className="text-resizer__label">Text size</span>
              <fieldset className="segmented">
                <legend className="sr-only">Text size</legend>
                <label>
                  <input type="radio" name="textSize" value="small" onChange={() => handleTextSize('small')} />
                  {' '}Small
                </label>
                <label>
                  <input type="radio" name="textSize" value="medium" defaultChecked onChange={() => handleTextSize('medium')} />
                  {' '}Medium
                </label>
                <label>
                  <input type="radio" name="textSize" value="large" onChange={() => handleTextSize('large')} />
                  {' '}Large
                </label>
              </fieldset>
            </div>
          </div>
          <div>
            <p className="site-footer__copy">Made in Oakland, California.</p>
            <p className="site-footer__copy site-footer__copy--spaced-sm">
              <time dateTime="2026">&copy; 2026</time>
            </p>
            <nav aria-label="Site links">
              <Link to="/admin" className="site-footer__link">Admin</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}
