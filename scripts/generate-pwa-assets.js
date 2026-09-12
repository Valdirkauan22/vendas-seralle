import sharp from "sharp";
import fs from "fs";
import path from "path";

async function generate() {
  const publicDir = path.resolve(process.cwd(), "public");

  const logoSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <defs>
      <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0082D7" />
        <stop offset="100%" stop-color="#003580" />
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="96" fill="url(#blueGrad)" />
    <path d="M 276 0 C 225 71, 169 174, 174 256 C 179 338, 286 410, 245 512 L 204 512 C 245 415, 133 333, 128 256 C 123 179, 235 77, 235 0 Z" fill="#ffffff" />
    <text x="256" y="470" font-family="Arial, sans-serif" font-weight="900" font-size="38" fill="#ffffff" text-anchor="middle" letter-spacing="4">SERALLÊ</text>
  </svg>`;

  const maskableSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <defs>
      <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0082D7" />
        <stop offset="100%" stop-color="#003580" />
      </linearGradient>
    </defs>
    <rect width="512" height="512" fill="url(#blueGrad)" />
    <g transform="translate(64, 40) scale(0.75)">
      <path d="M 276 0 C 225 71, 169 174, 174 256 C 179 338, 286 410, 245 512 L 204 512 C 245 415, 133 333, 128 256 C 123 179, 235 77, 235 0 Z" fill="#ffffff" />
      <text x="256" y="480" font-family="Arial, sans-serif" font-weight="900" font-size="44" fill="#ffffff" text-anchor="middle" letter-spacing="6">SERALLÊ</text>
    </g>
  </svg>`;

  const screenshotSvgMobile = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1334" width="750" height="1334">
    <rect width="750" height="1334" fill="#0b1329" />
    <!-- Header -->
    <rect width="750" height="160" fill="#003580" />
    <text x="375" y="100" font-family="Arial, sans-serif" font-weight="bold" font-size="34" fill="#ffffff" text-anchor="middle">Diário de Vendas Serallê</text>
    <!-- Cards -->
    <rect x="40" y="200" width="670" height="240" rx="20" fill="#1e293b" />
    <text x="75" y="270" font-family="Arial, sans-serif" font-size="22" fill="#94a3b8">Vendido no Mês</text>
    <text x="75" y="340" font-family="Arial, sans-serif" font-weight="bold" font-size="48" fill="#38bdf8">R$ 48.950,00</text>
    <rect x="40" y="480" width="670" height="240" rx="20" fill="#1e293b" />
    <text x="75" y="550" font-family="Arial, sans-serif" font-size="22" fill="#94a3b8">Meta do Mês / PA</text>
    <text x="75" y="620" font-family="Arial, sans-serif" font-weight="bold" font-size="48" fill="#10b981">Meta: 104% (PA 1.82)</text>
    <rect x="40" y="760" width="670" height="400" rx="20" fill="#1e293b" />
    <text x="75" y="830" font-family="Arial, sans-serif" font-size="24" fill="#f8fafc" font-weight="bold">Lançamento por Voz &amp; Crediário</text>
  </svg>`;

  const screenshotSvgDesktop = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 800" width="1280" height="800">
    <rect width="1280" height="800" fill="#0b1329" />
    <rect width="1280" height="90" fill="#003580" />
    <text x="640" y="55" font-family="Arial, sans-serif" font-weight="bold" font-size="28" fill="#ffffff" text-anchor="middle">Diário de Vendas Serallê Calçados</text>
    <rect x="60" y="130" width="360" height="200" rx="16" fill="#1e293b" />
    <rect x="460" y="130" width="360" height="200" rx="16" fill="#1e293b" />
    <rect x="860" y="130" width="360" height="200" rx="16" fill="#1e293b" />
    <rect x="60" y="360" width="1160" height="380" rx="16" fill="#1e293b" />
  </svg>`;

  // 1. 512x512 PNG
  await sharp(Buffer.from(logoSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, "icon-512.png"));

  // 2. 192x192 PNG
  await sharp(Buffer.from(logoSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, "icon-192.png"));

  // 3. Maskable 512x512 PNG
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, "icon-maskable-512.png"));

  // 4. Screenshots
  await sharp(Buffer.from(screenshotSvgMobile))
    .resize(750, 1334)
    .png()
    .toFile(path.join(publicDir, "screenshot-mobile.png"));

  await sharp(Buffer.from(screenshotSvgDesktop))
    .resize(1280, 800)
    .png()
    .toFile(path.join(publicDir, "screenshot-desktop.png"));

  console.log("PWA icons and screenshots generated successfully!");
}

generate().catch(console.error);
