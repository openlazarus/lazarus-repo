// File type icon mappings
export const FILE_ICONS = {
  // Documents
  pdf: '/icons/files/pdf.svg',
  doc: '/icons/files/doc.svg',
  docx: '/icons/files/doc.svg',
  txt: '/icons/files/txt.svg',
  md: '/icons/files/markdown.svg',
  markdown: '/icons/files/markdown.svg',

  // Spreadsheets
  xls: '/icons/files/xls.svg',
  xlsx: '/icons/files/xls.svg',
  csv: '/icons/files/csv.svg',

  // Presentations
  ppt: '/icons/files/ppt.svg',
  pptx: '/icons/files/ppt.svg',

  // Code
  js: '/icons/files/js.svg',
  jsx: '/icons/files/react.svg',
  ts: '/icons/files/ts.svg',
  tsx: '/icons/files/react.svg',
  py: '/icons/files/python.svg',
  java: '/icons/files/java.svg',
  cpp: '/icons/files/cpp.svg',
  c: '/icons/files/c.svg',
  go: '/icons/files/go.svg',
  rs: '/icons/files/rust.svg',
  rb: '/icons/files/ruby.svg',
  php: '/icons/files/php.svg',
  swift: '/icons/files/swift.svg',
  kt: '/icons/files/kotlin.svg',

  // Web
  html: '/icons/files/html.svg',
  css: '/icons/files/css.svg',
  scss: '/icons/files/scss.svg',
  sass: '/icons/files/sass.svg',
  less: '/icons/files/less.svg',
  json: '/icons/files/json.svg',
  xml: '/icons/files/xml.svg',
  yaml: '/icons/files/yaml.svg',
  yml: '/icons/files/yaml.svg',

  // Images
  jpg: '/icons/files/image.svg',
  jpeg: '/icons/files/image.svg',
  png: '/icons/files/image.svg',
  gif: '/icons/files/image.svg',
  svg: '/icons/files/svg.svg',
  webp: '/icons/files/image.svg',
  ico: '/icons/files/image.svg',

  // Videos
  mp4: '/icons/files/video.svg',
  mov: '/icons/files/video.svg',
  avi: '/icons/files/video.svg',
  mkv: '/icons/files/video.svg',
  webm: '/icons/files/video.svg',

  // Audio
  mp3: '/icons/files/audio.svg',
  wav: '/icons/files/audio.svg',
  flac: '/icons/files/audio.svg',
  m4a: '/icons/files/audio.svg',

  // Archives
  zip: '/icons/files/zip.svg',
  rar: '/icons/files/zip.svg',
  '7z': '/icons/files/zip.svg',
  tar: '/icons/files/zip.svg',
  gz: '/icons/files/zip.svg',

  // Other
  default: '/icons/files/file.svg',
} as const

export type FileIconType = keyof typeof FILE_ICONS
