/**
 * Loads lazarus/.env before any module reads process.env (import order / hoisting).
 * Path is fixed to the lazarus package root (not cwd), so it works from tests and scripts.
 */
import * as path from 'path'
import dotenv from 'dotenv'

const lazarusRoot = path.resolve(__dirname, '..')

dotenv.config({ path: path.join(lazarusRoot, '.env') })
