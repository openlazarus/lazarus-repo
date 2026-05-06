import { spawn } from 'child_process'
import { networkInterfaces } from 'os'

import qrcode from 'qrcode-terminal'

// Terminal styling using brand colors from system.ts
const COLORS = {
  blue: '\x1b[38;2;0;152;252m', // #0098FC
  purple: '\x1b[38;2;191;90;242m', // #BF5AF2
  red: '\x1b[38;2;255;55;95m', // #FF375F
  orange: '\x1b[38;2;254;159;12m', // #FE9F0C
  yellow: '\x1b[38;2;255;204;0m', // #FFCC00
  green: '\x1b[38;2;49;209;88m', // #31D158
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
}

// Vintage-style header using brand colors
const createHeader = () => `
   ${COLORS.blue}███${COLORS.purple}███${COLORS.red}███${COLORS.orange}███${COLORS.yellow}███${COLORS.green}███${COLORS.reset}
   ${COLORS.bold}LAZARUS${COLORS.reset}
   ${COLORS.dim}Technology Co.${COLORS.reset}
   ${COLORS.blue}━━━${COLORS.purple}━━━${COLORS.red}━━━${COLORS.orange}━━━${COLORS.yellow}━━━${COLORS.green}━━━${COLORS.reset}
`

// Get local IP address
const getLocalIpAddress = () => {
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (!net.internal && net.family === 'IPv4') {
        return net.address
      }
    }
  }
  return 'localhost'
}

const ip = getLocalIpAddress()
const url = `http://${ip}:3000`

// Clear terminal for clean start
console.clear()

// Display vintage header
console.log(createHeader())

// Development URLs with retro styling
console.log(
  `${COLORS.dim}Development Server Status: ${COLORS.green}ONLINE${COLORS.reset}\n`,
)
console.log(`${COLORS.blue}→ ${COLORS.reset}Local:   http://localhost:3000`)
console.log(`${COLORS.blue}→ ${COLORS.reset}Network: ${url}\n`)

// Compact QR code with universal frame
console.log(`${COLORS.dim}Mobile Access${COLORS.reset}`)
console.log(`${COLORS.blue}┌${'─'.repeat(32)}┐${COLORS.reset}`)
qrcode.generate(url, { small: true })
console.log(`${COLORS.blue}└${'─'.repeat(32)}┘${COLORS.reset}\n`)

// Startup message
console.log(
  `${COLORS.dim}Initializing development environment...${COLORS.reset}\n`,
)

// Start Next.js dev server
const nextDev = spawn('next', ['dev'], { stdio: 'inherit' })

nextDev.on('error', (err) => {
  console.error(
    `${COLORS.red}System Error: Development server failed to start${COLORS.reset}`,
    err,
  )
  process.exit(1)
})