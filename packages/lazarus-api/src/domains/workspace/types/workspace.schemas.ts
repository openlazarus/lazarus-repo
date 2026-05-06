import { z } from 'zod'

// Create workspace schema - simplified without team
export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  additionalPaths: z.array(z.string()).optional(),
  mcpServers: z.array(z.string()).optional(),
  mcpConfig: z.record(z.string(), z.any()).optional(),
  templateId: z.string().optional().default('default'),
  inviteEmails: z.array(z.string().email()).optional(), // Optional emails to invite on creation
})

// Update workspace schema
export const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  mcpServers: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})

// Workspace member schemas - added 'editor' role
export const AddWorkspaceMemberSchema = z
  .object({
    userId: z.string().uuid().optional(),
    email: z.string().email().optional(),
    role: z.enum(['admin', 'editor', 'member', 'viewer']).default('editor'),
  })
  .refine((data) => data.userId || data.email, {
    message: 'Either userId or email must be provided',
  })

export const UpdateWorkspaceMemberRoleSchema = z.object({
  role: z.enum(['admin', 'editor', 'member', 'viewer']),
})

// Workspace invitation schemas
export const CreateInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'editor', 'member', 'viewer']).default('editor'),
})

// Transfer workspace schema
export const TransferWorkspaceSchema = z.object({
  newOwnerId: z.string().uuid(),
})

export const UpdateConfigSchema = z.object({
  slug: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
})
