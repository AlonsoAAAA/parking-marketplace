export const CARD_COLORS = [
  { bg: '#E8E0CC', accent: '#D4C9A8', text: '#2a2118' },
  { bg: '#D6E4D6', accent: '#B8D4B8', text: '#1a2e1a' },
  { bg: '#E2D6E8', accent: '#C8B4D4', text: '#221428' },
  { bg: '#E8D8D0', accent: '#D4B8A8', text: '#2e1a14' },
  { bg: '#D4DDE8', accent: '#B4C4D4', text: '#141e2e' },
];

export const SHARED_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #EDEDED; }
  @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes spin { to { transform:rotate(360deg); } }
  .pm-page { min-height:100vh; background:#EDEDED; font-family:Inter,-apple-system,sans-serif; color:#1a1a1a; animation:fadeIn 0.35s ease both; }
  .pm-header { display:flex; align-items:center; justify-content:space-between; padding:20px 24px 16px; position:sticky; top:0; background:rgba(237,237,237,.95); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); z-index:100; }
  @media(min-width:1024px){ .pm-header { padding:20px 56px 16px; } }
  .pm-logo { font-size:11px; font-weight:600; letter-spacing:4px; text-transform:uppercase; color:#1a1a1a; text-decoration:none; }
  .pm-logo span { color:#999; }
  .pm-back { font-size:10px; color:#999; text-decoration:none; letter-spacing:1.5px; text-transform:uppercase; display:inline-flex; align-items:center; gap:6px; transition:color 0.2s; background:none; border:none; cursor:pointer; font-family:Inter,sans-serif; padding:0; }
  .pm-back:hover { color:#1a1a1a; }
  .pm-nav-link { font-size:10px; color:#999; text-decoration:none; letter-spacing:2px; text-transform:uppercase; transition:color 0.2s; }
  .pm-nav-link:hover { color:#1a1a1a; }
  .pm-btn-primary { display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:14px 24px; background:#1a1a1a; color:#EDEDED; border:none; border-radius:10px; font-size:13px; font-weight:600; font-family:Inter,sans-serif; cursor:pointer; transition:all 0.2s; letter-spacing:0.2px; width:100%; }
  .pm-btn-primary:hover { background:#333; }
  .pm-btn-primary:disabled { opacity:0.5; cursor:not-allowed; }
  .pm-btn-secondary { display:inline-flex; align-items:center; justify-content:center; padding:12px 24px; background:transparent; color:#1a1a1a; border:1px solid rgba(0,0,0,0.18); border-radius:10px; font-size:13px; font-weight:500; font-family:Inter,sans-serif; cursor:pointer; transition:all 0.2s; width:100%; }
  .pm-btn-secondary:hover { background:rgba(0,0,0,0.05); }
  .pm-error { background:#fef2f2; border:1px solid #fecaca; border-radius:10px; padding:12px 16px; font-size:13px; color:#991b1b; margin-bottom:12px; }
  .pm-label { font-size:10px; font-weight:600; letter-spacing:2px; text-transform:uppercase; color:#999; display:block; margin-bottom:8px; }
`;
