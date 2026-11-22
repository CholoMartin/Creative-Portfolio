// shared SVG icon set (kept separate so portfolio windows can use it without circular imports)
export const ICONS = {
  bag: <path d="M6 8h12l-1 12H7L6 8zm3 0V6a3 3 0 016 0v2" />,
  palette: <><path d="M12 3a9 9 0 100 18c1.4 0 2-.9 1.5-2-.6-1.2.1-2.5 1.5-2.5H17a4 4 0 004-4c0-5-4-9.5-9-9.5z" /><circle cx="8" cy="11" r="1" /><circle cx="12" cy="7.5" r="1" /><circle cx="16" cy="11" r="1" /></>,
  play: <><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M10 9l5 2-5 2V9zM8 20h8" /></>,
  layers: <path d="M12 3l9 5-9 5-9-5 9-5zm-9 9l9 5 9-5M3 16l9 5 9-5" />,
  gem: <path d="M6 4h12l3 5-9 11L3 9l3-5zm-3 5h18M9 4l3 16 3-16" />,
  pad: <><path d="M7 9h10a4 4 0 014 4v2a2 2 0 01-3.4 1.4L16 15H8l-1.6 1.4A2 2 0 013 15v-2a4 4 0 014-4z" /><path d="M8 11v2M7 12h2" /></>,
  home: <path d="M4 11l8-7 8 7v9h-5v-6H9v6H4v-9z" />,
}
export const Icon = ({ name, size = 18 }) => (
  <svg className="ico" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[name]}</svg>
)

