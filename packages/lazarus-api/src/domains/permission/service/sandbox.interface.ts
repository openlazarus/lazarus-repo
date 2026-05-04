export interface IWorkspaceSandbox {
  /** Check if a target path is within the allowed workspace roots. */
  isPathAllowed(targetPath: string): boolean
}
