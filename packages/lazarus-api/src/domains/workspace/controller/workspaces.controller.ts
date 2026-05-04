import { Request, Response } from 'express'
import { WorkspaceManager } from '@domains/workspace/service/workspace-manager'
import { workspaceConfigService } from '@domains/workspace/service/workspace-config.service'
import { z } from 'zod'
import * as fs from 'fs/promises'
import * as path from 'path'
import { workspaceRepository } from '@domains/workspace/repository/workspace.repository'
import { WorkspaceAgentService } from '@domains/agent/service/workspace-agent.service'
import { mcpConfigManager } from '@domains/mcp/service/mcp-config-manager'
import Database from 'better-sqlite3'
import {
  ApiError,
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '@errors/api-errors'
import { createLogger } from '@utils/logger'

const log = createLogger('workspaces-controller')

const workspaceManager = new WorkspaceManager()
const agentService = new WorkspaceAgentService(workspaceManager)

const templateDbConnections = new Map<string, Database.Database>()

class WorkspacesController {
  async get(req: Request, res: Response) {
    try {
      const userId = req.user!.id
      const workspaceId = req.workspace!.id

      const workspace = await workspaceManager.getWorkspace(workspaceId, userId)

      if (!workspace) {
        throw new NotFoundError('Workspace', workspaceId)
      }

      res.json(workspace)
    } catch (error) {
      log.error({ err: error }, 'Error getting workspace')
      throw error
    }
  }

  async update(req: Request, res: Response) {
    try {
      const userId = req.user!.id
      const workspaceId = req.workspace!.id

      const data = req.body

      const workspace = await workspaceManager.getWorkspace(workspaceId, userId)

      if (!workspace) {
        throw new NotFoundError('Workspace', workspaceId)
      }

      Object.assign(workspace, {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.mcpServers && { mcpServers: data.mcpServers }),
        ...(data.metadata && { metadata: { ...workspace.metadata, ...data.metadata } }),
      })

      await workspaceManager.updateWorkspace(workspace)

      res.json({
        success: true,
        workspace,
      })
    } catch (error) {
      log.error({ err: error }, 'Error updating workspace')
      if (error instanceof z.ZodError) {
        throw new BadRequestError('Invalid request data')
      }
      throw error
    }
  }

  async transfer(req: Request, res: Response) {
    try {
      const userId = req.user!.id
      const workspaceId = req.workspace!.id

      const data = req.body

      const workspace = await workspaceManager.getWorkspace(workspaceId, userId)

      if (!workspace) {
        throw new NotFoundError('Workspace', workspaceId)
      }

      if (workspace.ownerId !== userId) {
        throw new ForbiddenError('Only the workspace owner can transfer ownership')
      }

      const transferred = await workspaceManager.transferWorkspace(
        workspaceId,
        userId,
        data.newOwnerId,
      )

      if (!transferred) {
        throw new BadRequestError('Failed to transfer workspace ownership')
      }

      res.json({
        success: true,
        message: 'Workspace ownership transferred',
      })
    } catch (error) {
      log.error({ err: error }, 'Error transferring workspace')
      if (error instanceof z.ZodError) {
        throw new BadRequestError('Invalid request data')
      }
      throw error
    }
  }

  async listFiles(req: Request, res: Response) {
    try {
      const userId = req.user!.id
      const workspaceId = req.workspace!.id
      const { path: relativePath = '', query: searchQuery } = req.query

      const workspace = await workspaceManager.getWorkspace(workspaceId, userId)

      if (!workspace) {
        throw new NotFoundError('Workspace', workspaceId)
      }

      if (searchQuery && typeof searchQuery === 'string' && searchQuery.trim()) {
        const results = await workspaceManager.searchFiles(workspace.path, searchQuery.trim(), 50)
        res.json({ files: results, count: results.length, path: '', query: searchQuery })
        return
      }

      let files = await workspaceManager.listFiles(workspace.path, relativePath as string)

      files = files.filter(
        (f) =>
          !f.name.startsWith('.') &&
          f.name !== 'projects.index.json' &&
          f.name !== 'databases.index.json' &&
          f.name !== 'node_modules',
      )

      const isRootDir = !relativePath || relativePath === '' || relativePath === '/'

      if (isRootDir) {
        files.push({
          name: 'Memory package',
          path: '.knowledge',
          type: 'file',
          modifiedAt: new Date().toISOString(),
          displayName: 'Memory package',
          virtual: true,
          icon: 'PACKAGE_ICON',
        })
      }

      if (isRootDir) {
        files.push({
          name: 'Workspace Config',
          path: '.workspace.json',
          type: 'file',
          modifiedAt: new Date().toISOString(),
          displayName: 'Workspace Config',
          virtual: true,
          icon: 'CONFIG_ICON',
        })

        files.push({
          name: 'Agents',
          path: 'agents',
          type: 'directory',
          modifiedAt: new Date().toISOString(),
          displayName: 'Agents',
          virtual: true,
          icon: 'AGENTS_ICON',
        })

        files.push({
          name: 'Sources',
          path: 'sources',
          type: 'directory',
          modifiedAt: new Date().toISOString(),
          displayName: 'Sources',
          virtual: true,
          icon: 'SOURCES_ICON',
        })

        files.push({
          name: 'Activity',
          path: 'activity',
          type: 'directory',
          modifiedAt: new Date().toISOString(),
          displayName: 'Activity',
          virtual: true,
          icon: 'ACTIVITY_ICON',
        })

        files.push({
          name: 'Approvals',
          path: 'approvals',
          type: 'directory',
          modifiedAt: new Date().toISOString(),
          displayName: 'Approvals',
          virtual: true,
          icon: 'APPROVALS_ICON',
        })
      }

      try {
        const indexPath = path.join(workspace.path, 'projects.index.json')
        const indexContent = await fs.readFile(indexPath, 'utf-8')
        const index = JSON.parse(indexContent)

        files = files.map((file) => {
          if (file.name.endsWith('.app')) {
            const project = index.projects.find(
              (p: any) => p.path === file.name || `${p.id}.app` === file.name,
            )
            if (project) {
              return {
                ...file,
                displayName: project.name,
                icon: 'v0-icon.svg',
              }
            }
          }

          if (file.name.endsWith('.sqlite')) {
            return {
              ...file,
              icon: 'sqlite-icon-official.svg',
            }
          }

          return file
        })
      } catch (err) {
        log.debug({ err }, "Index file doesn't exist yet, that's okay")
      }

      files = files.map((file) => {
        const isLocked = file.name.startsWith('+')
        const isInAgentsFolder = file.path.startsWith('.agents/') || file.path === '.agents'
        const isReadonly = isInAgentsFolder

        return {
          ...file,
          isLocked,
          isReadonly,
        }
      })

      res.json({
        files,
        count: files.length,
        path: relativePath,
      })
    } catch (error) {
      log.error({ err: error }, 'Error listing files')
      throw error
    }
  }

  async readFile(req: Request, res: Response) {
    try {
      const userId = req.user!.id
      const workspaceId = req.workspace!.id
      const filePath = req.params[0]!

      const workspace = await workspaceManager.getWorkspace(workspaceId, userId)

      if (!workspace) {
        throw new NotFoundError('Workspace', workspaceId)
      }

      if (
        filePath === 'agents' ||
        filePath === 'sources' ||
        filePath === 'activity' ||
        filePath === 'approvals'
      ) {
        throw new BadRequestError(
          'Virtual paths cannot be read as files',
          `The path '${filePath}' is a virtual collection and cannot be read directly`,
        )
      }

      const result = await workspaceManager.readFile(workspace.path, filePath)

      res.json({
        path: filePath,
        content: result.content,
        encoding: result.encoding,
        size: result.size,
      })
    } catch (error) {
      if (error instanceof ApiError) throw error
      throw new NotFoundError('File', req.params[0])
    }
  }

  async writeFile(req: Request, res: Response) {
    try {
      const userId = req.user!.id
      const workspaceId = req.workspace!.id
      const filePath = req.params[0]!
      const { content, encoding = 'utf-8' } = req.body

      if (typeof content !== 'string') {
        throw new BadRequestError('Content must be a string')
      }

      if (encoding && encoding !== 'utf-8' && encoding !== 'base64') {
        throw new BadRequestError('Encoding must be utf-8 or base64')
      }

      if (filePath.startsWith('.agents/') || filePath === '.agents') {
        throw new ForbiddenError(
          'The .agents folder is read-only. Manage agents through the Agents viewer.',
        )
      }

      const basename = path.basename(filePath)
      if (basename.startsWith('+')) {
        throw new ForbiddenError('Cannot edit locked file')
      }

      const workspace = await workspaceManager.getWorkspace(workspaceId, userId)

      if (!workspace) {
        throw new NotFoundError('Workspace', workspaceId)
      }

      await workspaceManager.writeFile(
        workspace.path,
        filePath,
        content,
        encoding as 'utf-8' | 'base64',
      )

      res.json({
        success: true,
        path: filePath,
        message: 'File saved',
      })
    } catch (error) {
      log.error({ err: error }, 'Error writing file')
      throw error
    }
  }

  async uploadFile(req: Request, res: Response) {
    try {
      const userId = req.user!.id
      const workspaceId = req.workspace!.id
      const { path: filePath } = req.body

      if (!req.file) {
        throw new BadRequestError('No file uploaded')
      }

      if (!filePath) {
        throw new BadRequestError('File path required')
      }

      if (filePath.startsWith('.agents/') || filePath === '.agents') {
        throw new ForbiddenError(
          'The .agents folder is read-only. Manage agents through the Agents viewer.',
        )
      }

      const basename = path.basename(filePath)
      if (basename.startsWith('+')) {
        throw new ForbiddenError('Cannot edit locked file')
      }

      const workspace = await workspaceManager.getWorkspace(workspaceId, userId)

      if (!workspace) {
        throw new NotFoundError('Workspace', workspaceId)
      }

      const fullPath = path.join(workspace.path, filePath)
      const dir = path.dirname(fullPath)
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(fullPath, req.file.buffer)

      res.json({
        success: true,
        path: filePath,
        size: req.file.size,
        message: 'File uploaded successfully',
      })
    } catch (error) {
      log.error({ err: error }, 'Error uploading file')
      throw error
    }
  }

  async deleteFile(req: Request, res: Response) {
    try {
      const userId = req.user!.id
      const workspaceId = req.workspace!.id
      const filePath = req.params[0]!

      if (filePath.startsWith('.agents/') || filePath === '.agents') {
        throw new ForbiddenError(
          'The .agents folder is read-only. Manage agents through the Agents viewer.',
        )
      }

      const basename = path.basename(filePath)
      if (basename.startsWith('+')) {
        throw new ForbiddenError('Cannot delete locked file')
      }

      const workspace = await workspaceManager.getWorkspace(workspaceId, userId)

      if (!workspace) {
        throw new NotFoundError('Workspace', workspaceId)
      }

      await workspaceManager.deleteFile(workspace.path, filePath)

      res.json({
        success: true,
        path: filePath,
        message: 'File deleted',
      })
    } catch (error) {
      if (error instanceof ApiError) throw error
      throw new NotFoundError('File', req.params[0])
    }
  }

  async moveFile(req: Request, res: Response) {
    try {
      const userId = req.user!.id
      const workspaceId = req.workspace!.id
      const { source_path, destination_path } = req.body

      if (!source_path || !destination_path) {
        throw new BadRequestError('source_path and destination_path are required')
      }

      if (
        source_path.startsWith('.agents/') ||
        source_path === '.agents' ||
        destination_path.startsWith('.agents/') ||
        destination_path === '.agents'
      ) {
        throw new ForbiddenError(
          'The .agents folder is read-only. Manage agents through the Agents viewer.',
        )
      }

      const basename = path.basename(source_path)
      if (basename.startsWith('+')) {
        throw new ForbiddenError('Cannot move locked file')
      }

      const workspace = await workspaceManager.getWorkspace(workspaceId, userId)

      if (!workspace) {
        throw new NotFoundError('Workspace', workspaceId)
      }

      await workspaceManager.moveFile(workspace.path, source_path, destination_path)

      res.json({
        success: true,
        source_path,
        destination_path,
        message: 'File moved successfully',
      })
    } catch (error) {
      log.error({ err: error }, 'Error moving file')
      throw error
    }
  }

  async createDirectory(req: Request, res: Response) {
    try {
      const userId = req.user!.id
      const workspaceId = req.workspace!.id
      const { path: dirPath } = req.body

      if (!dirPath) {
        throw new BadRequestError('path is required')
      }

      if (dirPath.startsWith('.agents/') || dirPath === '.agents') {
        throw new ForbiddenError(
          'The .agents folder is read-only. Manage agents through the Agents viewer.',
        )
      }

      const workspace = await workspaceManager.getWorkspace(workspaceId, userId)

      if (!workspace) {
        throw new NotFoundError('Workspace', workspaceId)
      }

      const fullPath = path.join(workspace.path, dirPath)

      await fs.mkdir(fullPath, { recursive: true })

      res.json({
        success: true,
        path: dirPath,
        message: 'Directory created successfully',
      })
    } catch (error) {
      log.error({ err: error }, 'Error creating directory')
      throw error
    }
  }

  async lockFile(req: Request, res: Response) {
    try {
      const userId = req.user!.id
      const workspaceId = req.workspace!.id
      const { path: filePath } = req.body

      if (!filePath) {
        throw new BadRequestError('path is required')
      }

      const workspace = await workspaceManager.getWorkspace(workspaceId, userId)

      if (!workspace) {
        throw new NotFoundError('Workspace', workspaceId)
      }

      const fullPath = path.join(workspace.path, filePath)
      const dirname = path.dirname(fullPath)
      const basename = path.basename(fullPath)

      if (basename.startsWith('+')) {
        throw new BadRequestError('File is already locked')
      }

      const newPath = path.join(dirname, '+' + basename)
      await fs.rename(fullPath, newPath)

      res.json({
        success: true,
        message: 'File locked successfully',
        newPath: path.relative(workspace.path, newPath),
      })
    } catch (error) {
      log.error({ err: error }, 'Error locking file')
      throw error
    }
  }

  async unlockFile(req: Request, res: Response) {
    try {
      const userId = req.user!.id
      const workspaceId = req.workspace!.id
      const { path: filePath } = req.body

      if (!filePath) {
        throw new BadRequestError('path is required')
      }

      const workspace = await workspaceManager.getWorkspace(workspaceId, userId)

      if (!workspace) {
        throw new NotFoundError('Workspace', workspaceId)
      }

      const fullPath = path.join(workspace.path, filePath)
      const dirname = path.dirname(fullPath)
      const basename = path.basename(fullPath)

      if (!basename.startsWith('+')) {
        throw new BadRequestError('File is not locked')
      }

      const newPath = path.join(dirname, basename.slice(1))
      await fs.rename(fullPath, newPath)

      res.json({
        success: true,
        message: 'File unlocked successfully',
        newPath: path.relative(workspace.path, newPath),
      })
    } catch (error) {
      log.error({ err: error }, 'Error unlocking file')
      throw error
    }
  }

  async getContext(req: Request, res: Response) {
    try {
      const userId = req.user!.id
      const workspaceId = req.workspace!.id

      const workspace = await workspaceManager.getWorkspace(workspaceId, userId)

      if (!workspace) {
        throw new NotFoundError('Workspace', workspaceId)
      }

      const context = await workspaceManager.getWorkspaceContext(workspace)

      res.json({
        workspaceId,
        context,
      })
    } catch (error) {
      log.error({ err: error }, 'Error getting context')
      throw error
    }
  }

  async getMcp(req: Request, res: Response) {
    try {
      const userId = req.user!.id
      const workspaceId = req.workspace!.id

      const workspace = await workspaceManager.getWorkspace(workspaceId, userId)

      if (!workspace) {
        throw new NotFoundError('Workspace', workspaceId)
      }

      const mcpConfig = await mcpConfigManager.getResolvedWorkspaceMCPConfig(workspace.path)

      res.json({
        workspaceId,
        mcpConfig,
      })
    } catch (error) {
      log.error({ err: error }, 'Error getting MCP config')
      throw error
    }
  }

  async getConfig(req: Request, res: Response) {
    try {
      const userId = req.user!.id
      const workspaceId = req.workspace!.id

      const workspace = await workspaceManager.getWorkspace(workspaceId, userId)

      if (!workspace) {
        throw new NotFoundError('Workspace', workspaceId)
      }

      const config = await workspaceConfigService.getConfig(workspace.path, workspaceId)

      const mergedConfig = {
        ...config,
        name: workspace.name,
        description: workspace.description,
      }

      res.json({
        success: true,
        config: mergedConfig,
      })
    } catch (error) {
      log.error({ err: error }, 'Error getting workspace config')
      throw error
    }
  }

  async updateConfig(req: Request, res: Response) {
    try {
      const userId = req.user!.id
      const workspaceId = req.workspace!.id

      const workspace = await workspaceManager.getWorkspace(workspaceId, userId)

      if (!workspace) {
        throw new NotFoundError('Workspace', workspaceId)
      }

      const updates = req.body

      const config = await workspaceConfigService.updateConfig(workspace.path, workspaceId, {
        slug: updates.slug,
      })

      if (
        updates.slug !== undefined ||
        updates.name !== undefined ||
        updates.description !== undefined
      ) {
        const wsUpdates: Record<string, any> = {
          ...(updates.slug !== undefined && { slug: updates.slug }),
          ...(updates.name !== undefined && { name: updates.name }),
          ...(updates.description !== undefined && { description: updates.description }),
        }

        await workspaceRepository.updateWorkspace(workspaceId, wsUpdates)
      }

      if (updates.slug) {
        await agentService.updateAgentEmails(workspaceId, userId, updates.slug)
      }

      const mergedConfig = {
        ...config,
        name: updates.name ?? workspace.name,
        description: updates.description ?? workspace.description,
      }

      res.json({
        success: true,
        config: mergedConfig,
        message: 'Workspace configuration updated',
      })
    } catch (error) {
      log.error({ err: error }, 'Error updating workspace config')
      if (error instanceof z.ZodError) {
        throw new BadRequestError('Invalid request data')
      }
      throw error
    }
  }

  async validateSlug(req: Request, res: Response) {
    try {
      const workspaceId = req.workspaceId!
      const { slug } = req.body

      if (!slug || typeof slug !== 'string') {
        throw new BadRequestError('Slug is required')
      }

      const validation = await workspaceConfigService.validateSlug(slug, workspaceId)

      res.json({
        valid: validation.valid,
        error: validation.error,
      })
    } catch (error) {
      log.error({ err: error }, 'Error validating slug')
      throw error
    }
  }

  async getMembers(req: Request, res: Response) {
    try {
      const userId = req.user!.id
      const workspaceId = req.workspace!.id

      const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
      if (!workspace) {
        throw new NotFoundError('Workspace', workspaceId)
      }

      const memberRows = await workspaceRepository.getWorkspaceMembers(workspaceId)

      const userIds = memberRows.map((m) => m.user_id)
      const profileRows = await workspaceRepository.getProfilesByIds(userIds)

      const profileMap = new Map(profileRows.map((p) => [p.id, p]))

      const members = memberRows.map((member) => ({
        ...member,
        profile: profileMap.get(member.user_id) || null,
      }))

      res.json({
        members,
        count: members.length,
      })
    } catch (error) {
      log.error({ err: error }, 'Error fetching members')

      if (error instanceof Error && error.message.includes('not a member')) {
        throw new ForbiddenError(error.message)
      }

      throw error
    }
  }

  async addMember(req: Request, res: Response) {
    try {
      const userId = req.user!.id
      const workspaceId = req.workspace!.id

      const { userId: newMemberId, email, role } = req.body

      const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
      if (!workspace) {
        throw new NotFoundError('Workspace', workspaceId)
      }

      if (email) {
        const existingUser = await workspaceRepository.getProfileByEmail(email)

        if (existingUser) {
          const existingMember = await workspaceRepository.getWorkspaceMembership(
            workspaceId,
            existingUser.id,
          )

          if (existingMember) {
            throw new ConflictError('User is already a member of this workspace')
          }

          const memberRow = await workspaceRepository.addWorkspaceMemberFull({
            workspace_id: workspaceId,
            user_id: existingUser.id,
            role,
            invited_by: userId,
            joined_at: new Date().toISOString(),
          })

          const profile = await workspaceRepository.getProfileById(existingUser.id)

          res.status(201).json({
            member: {
              ...memberRow,
              profile: profile || null,
            },
            message: 'Member added successfully',
          })
        } else {
          let invitation
          try {
            invitation = await workspaceRepository.insertWorkspaceInvitation({
              workspace_id: workspaceId,
              email,
              role,
              invited_by: userId,
            })
          } catch (err: any) {
            if (err.code === '23505') {
              throw new ConflictError('An invitation has already been sent to this email')
            }
            throw err
          }

          res.status(201).json({
            invitation,
            message: 'Invitation sent successfully',
          })
        }
      } else if (newMemberId) {
        const existingMember = await workspaceRepository.getWorkspaceMembership(
          workspaceId,
          newMemberId,
        )

        if (existingMember) {
          throw new ConflictError('User is already a member of this workspace')
        }

        const memberRow = await workspaceRepository.addWorkspaceMemberFull({
          workspace_id: workspaceId,
          user_id: newMemberId,
          role,
          invited_by: userId,
          joined_at: new Date().toISOString(),
        })

        const profile = await workspaceRepository.getProfileById(newMemberId)

        res.status(201).json({
          member: {
            ...memberRow,
            profile: profile || null,
          },
          message: 'Member added successfully',
        })
      }
    } catch (error) {
      log.error({ err: error }, 'Error adding member')
      throw error
    }
  }

  async leaveWorkspace(req: Request, res: Response) {
    try {
      const userId = req.user!.id
      const workspaceId = req.workspace!.id

      const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
      if (!workspace) {
        throw new NotFoundError('Workspace', workspaceId)
      }

      if (userId === workspace.ownerId) {
        throw new ForbiddenError(
          'Workspace owner cannot leave. Transfer ownership first or delete the workspace.',
        )
      }

      await workspaceRepository.removeWorkspaceMember(workspaceId, userId)

      res.json({
        success: true,
        message: 'Successfully left the workspace',
      })
    } catch (error) {
      log.error({ err: error }, 'Error leaving workspace')
      throw error
    }
  }

  async removeMember(req: Request, res: Response) {
    try {
      const userId = req.user!.id
      const workspaceId = req.workspace!.id
      const memberId = req.params.memberId!

      const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
      if (!workspace) {
        throw new NotFoundError('Workspace', workspaceId)
      }

      if (memberId === workspace.ownerId) {
        throw new ForbiddenError('Cannot remove the workspace owner')
      }

      await workspaceRepository.removeWorkspaceMember(workspaceId, memberId)

      res.json({
        message: 'Member removed successfully',
      })
    } catch (error) {
      log.error({ err: error }, 'Error removing member')
      throw error
    }
  }

  async updateMemberRole(req: Request, res: Response) {
    try {
      const userId = req.user!.id
      const workspaceId = req.workspace!.id
      const memberId = req.params.memberId!

      const { role } = req.body

      const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
      if (!workspace) {
        throw new NotFoundError('Workspace', workspaceId)
      }

      if (memberId === workspace.ownerId) {
        throw new ForbiddenError('Cannot change the role of the workspace owner')
      }

      const memberRow = await workspaceRepository.updateWorkspaceMemberRole(
        workspaceId,
        memberId,
        role,
      )

      const profile = await workspaceRepository.getProfileById(memberId)

      const member = {
        ...memberRow,
        profile: profile || null,
      }

      res.json({
        member,
        message: 'Member role updated successfully',
      })
    } catch (error) {
      log.error({ err: error }, 'Error updating member role')
      throw error
    }
  }

  async getInvitations(req: Request, res: Response) {
    try {
      const userId = req.user!.id
      const workspaceId = req.workspace!.id

      const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
      if (!workspace) {
        throw new NotFoundError('Workspace', workspaceId)
      }

      const invitations = await workspaceRepository.getPendingWorkspaceInvitations(workspaceId)

      res.json({
        invitations,
        count: invitations?.length || 0,
      })
    } catch (error) {
      log.error({ err: error }, 'Error fetching invitations')
      throw error
    }
  }

  async createInvitation(req: Request, res: Response) {
    try {
      const userId = req.user!.id
      const workspaceId = req.workspace!.id

      const { email, role } = req.body

      const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
      if (!workspace) {
        throw new NotFoundError('Workspace', workspaceId)
      }

      const existingUser = await workspaceRepository.getProfileByEmail(email)

      if (existingUser) {
        const existingMember = await workspaceRepository.getWorkspaceMembership(
          workspaceId,
          existingUser.id,
        )

        if (existingMember) {
          throw new ConflictError('User is already a member of this workspace')
        }
      }

      let invitation
      try {
        invitation = await workspaceRepository.insertWorkspaceInvitation({
          workspace_id: workspaceId,
          email,
          role,
          invited_by: userId,
        })
      } catch (err: any) {
        if (err.code === '23505') {
          throw new ConflictError('An invitation has already been sent to this email')
        }
        throw err
      }

      res.status(201).json({
        invitation,
        message: 'Invitation sent successfully',
      })
    } catch (error) {
      log.error({ err: error }, 'Error creating invitation')
      throw error
    }
  }

  async cancelInvitation(req: Request, res: Response) {
    try {
      const userId = req.user!.id
      const workspaceId = req.workspace!.id
      const invitationId = req.params.invitationId!

      const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
      if (!workspace) {
        throw new NotFoundError('Workspace', workspaceId)
      }

      await workspaceRepository.deleteWorkspaceInvitation(invitationId, workspaceId)

      res.json({
        message: 'Invitation cancelled successfully',
      })
    } catch (error) {
      log.error({ err: error }, 'Error cancelling invitation')
      throw error
    }
  }

  async createTemplateDatabase(req: Request, res: Response) {
    try {
      const userId = req.user!.id
      const workspaceId = req.workspace!.id
      const { name, description, tables } = req.body

      if (!name) {
        throw new BadRequestError('Database name is required')
      }

      if (!tables || !Array.isArray(tables) || tables.length === 0) {
        throw new BadRequestError('Tables array is required')
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
        throw new BadRequestError(
          'Invalid database name. Use only letters, numbers, hyphens, and underscores.',
        )
      }

      const workspace = await workspaceManager.getWorkspace(workspaceId, userId)
      if (!workspace) {
        throw new NotFoundError('Workspace', workspaceId)
      }

      const dbDir = path.join(workspace.path, '.sqlite', name)
      const dbPath = path.join(dbDir, 'database.db')

      await fs.mkdir(dbDir, { recursive: true })

      const db = new Database(dbPath)
      db.pragma('journal_mode = WAL')
      templateDbConnections.set(dbPath, db)

      const sqlStatements: string[] = []

      for (const table of tables) {
        const columns = table.columns.map((col: any) =>
          [
            `"${col.name}" ${col.type}`,
            col.primaryKey ? 'PRIMARY KEY' : null,
            col.notNull ? 'NOT NULL' : null,
            col.unique ? 'UNIQUE' : null,
            col.default !== undefined && col.default !== null ? `DEFAULT ${col.default}` : null,
          ]
            .filter(Boolean)
            .join(' '),
        )

        const foreignKeys = table.columns
          .filter((col: any) => col.references)
          .map(
            (col: any) =>
              `FOREIGN KEY ("${col.name}") REFERENCES "${col.references.table}"("${col.references.column}")`,
          )

        const allConstraints = [...columns, ...foreignKeys]
        const createTableSql = `CREATE TABLE IF NOT EXISTS "${table.name}" (\n  ${allConstraints.join(',\n  ')}\n)`
        sqlStatements.push(createTableSql)

        if (table.indexes && Array.isArray(table.indexes)) {
          for (const index of table.indexes) {
            const uniqueStr = index.unique ? 'UNIQUE ' : ''
            const indexSql = `CREATE ${uniqueStr}INDEX IF NOT EXISTS "${index.name}" ON "${table.name}" (${index.columns.map((c: string) => `"${c}"`).join(', ')})`
            sqlStatements.push(indexSql)
          }
        }
      }

      for (const sql of sqlStatements) {
        try {
          db.exec(sql)
        } catch (sqlError) {
          log.error({ err: sqlError, sql }, 'Error executing SQL')
          throw sqlError
        }
      }

      for (const table of tables) {
        if (table.seedData && Array.isArray(table.seedData) && table.seedData.length > 0) {
          for (const row of table.seedData) {
            const columns = Object.keys(row)
            const placeholders = columns.map(() => '?').join(', ')
            const values = columns.map((col) => row[col])

            const insertSql = `INSERT INTO "${table.name}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})`

            try {
              db.prepare(insertSql).run(...values)
            } catch (insertError) {
              log.error({ err: insertError, table: table.name }, 'Error inserting seed data')
            }
          }
          log.info({ table: table.name, rows: table.seedData.length }, 'Inserted seed data')
        }
      }

      const tableInfos = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        .all() as Array<{ name: string }>

      const schema = {
        tables: tableInfos.map((t) => {
          const columns = db.prepare(`PRAGMA table_info('${t.name}')`).all() as Array<{
            name: string
            type: string
            notnull: number
            pk: number
            dflt_value: string | null
          }>
          const rowCount = (
            db.prepare(`SELECT COUNT(*) as count FROM '${t.name}'`).get() as { count: number }
          ).count

          return {
            name: t.name,
            columns: columns.map((col) => ({
              name: col.name,
              type: col.type,
              nullable: col.notnull === 0,
              primaryKey: col.pk > 0,
              defaultValue: col.dflt_value || undefined,
            })),
            rowCount,
          }
        }),
        generatedAt: new Date().toISOString(),
      }

      const stats = await fs.stat(dbPath)

      const descriptor = {
        id: name,
        name,
        description: description || `Template database: ${name}`,
        status: 'ready',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stats: {
          tables: schema.tables.length,
          totalRows: schema.tables.reduce((sum, t) => sum + t.rowCount, 0),
          sizeBytes: stats.size,
        },
        schema,
      }

      const descriptorPath = path.join(workspace.path, `${name}.sqlite`)
      await fs.writeFile(descriptorPath, JSON.stringify(descriptor, null, 2), 'utf-8')

      const indexPath = path.join(workspace.path, 'databases.index.json')
      let index: { version: string; databases: any[]; lastUpdated: string }

      try {
        const indexContent = await fs.readFile(indexPath, 'utf-8')
        index = JSON.parse(indexContent)
      } catch {
        index = { version: '1.0', databases: [], lastUpdated: '' }
      }

      const existingIdx = index.databases.findIndex((d) => d.id === name)
      const dbEntry = {
        id: name,
        name,
        path: `${name}.sqlite`,
        status: 'ready',
        updatedAt: descriptor.updatedAt,
      }

      if (existingIdx >= 0) {
        index.databases[existingIdx] = dbEntry
      } else {
        index.databases.push(dbEntry)
      }
      index.lastUpdated = new Date().toISOString()

      await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8')

      log.info({ name, tableCount: tables.length, workspaceId }, 'Created template database')

      res.json({
        success: true,
        database: descriptor,
        tablesCreated: tables.length,
      })
    } catch (error) {
      log.error({ err: error }, 'Error creating template database')
      throw error
    }
  }
}

export const workspacesController = new WorkspacesController()
