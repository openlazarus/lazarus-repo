import { tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { GoogleGenAI } from '@google/genai'
import * as fs from 'fs/promises'
import * as path from 'path'
import { getExecutionContext } from '@domains/execution/service/execution-context'
import { getContentType } from '@utils/mime-types'

/**
 * Google AI Tools for Agents
 *
 * Provides access to Google's generative AI capabilities:
 * - Veo 3.1 - Video generation from text/image prompts
 * - Gemini 2.5 - Multimodal analysis (images, videos, PDFs)
 * - Imagen 4 - Image generation from text
 * - Nano Banana 2 (Gemini 3.1 Flash Image) - Advanced image generation/editing
 *
 * All agents have access to these tools.
 */

// Initialize SDK
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY || '' })

/**
 * Get workspace path from environment variables
 */
function getWorkspacePath(): string {
  return getExecutionContext().workspacePath || ''
}

/**
 * Read file as base64 for multimodal input
 */
async function readFileAsBase64(filePath: string): Promise<{ data: string; mimeType: string }> {
  const workspacePath = getWorkspacePath()
  const fullPath = path.join(workspacePath, filePath)
  const buffer = await fs.readFile(fullPath)
  return { data: buffer.toString('base64'), mimeType: getContentType(filePath) }
}

/**
 * Save generated file to workspace
 * @param data - File data as Buffer or base64 string
 * @param customPath - Optional custom path relative to workspace (e.g., 'my-videos/output.mp4')
 * @param subdir - Default subdirectory under 'generated/' if no custom path
 * @param prefix - Default filename prefix if no custom path
 * @param ext - Default file extension if no custom path
 */
async function saveToWorkspace(
  data: Buffer | string,
  customPath: string | undefined,
  subdir: string,
  prefix: string,
  ext: string,
): Promise<string> {
  const workspacePath = getWorkspacePath()
  const buffer = typeof data === 'string' ? Buffer.from(data, 'base64') : data

  let relativePath: string
  let fullPath: string

  if (customPath) {
    // User specified a custom path - use it directly
    relativePath = customPath
    // Ensure the path has the right extension if not already there
    if (!relativePath.toLowerCase().endsWith(ext)) {
      relativePath = relativePath + ext
    }
    fullPath = path.join(workspacePath, relativePath)
    // Create parent directory
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
  } else {
    // Use default generated path
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `${prefix}_${timestamp}${ext}`
    relativePath = `generated/${subdir}/${filename}`
    const outputDir = path.join(workspacePath, 'generated', subdir)
    await fs.mkdir(outputDir, { recursive: true })
    fullPath = path.join(outputDir, filename)
  }

  await fs.writeFile(fullPath, buffer)
  return relativePath
}

export const googleAiTools = [
  // Tool 1: Gemini Analyze - Multimodal Analysis
  tool(
    'gemini_analyze',
    "Analyze images, videos, or PDFs from the workspace using Gemini's multimodal capabilities. Supports jpg, png, gif, webp, mp4, mov, and pdf files.",
    {
      file_path: z
        .string()
        .describe("Path to file in workspace (relative path, e.g., 'images/photo.jpg')"),
      prompt: z.string().describe('What to analyze or ask about the file'),
      model: z
        .enum(['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'])
        .optional()
        .describe('Model to use (default: gemini-2.5-flash)'),
    },
    async (args) => {
      try {
        const modelName = args.model || 'gemini-2.5-flash'
        const { data, mimeType } = await readFileAsBase64(args.file_path)

        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [{ inlineData: { mimeType, data } }, { text: args.prompt }],
            },
          ],
        })

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: true,
                  model: modelName,
                  file: args.file_path,
                  analysis: response.text,
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ success: false, error: error.message }, null, 2),
            },
          ],
        }
      }
    },
  ),

  // Tool 2: Veo Generate Video - Video Generation
  tool(
    'veo_generate_video',
    'Generate a video from a text prompt or reference image using Google Veo 3.1. Videos are 4-8 seconds. Returns path to generated video in workspace. Note: Video generation can take several minutes.',
    {
      prompt: z.string().describe('Text description of the video to generate'),
      reference_image: z
        .string()
        .optional()
        .describe('Path to reference image in workspace for image-to-video'),
      output_path: z
        .string()
        .optional()
        .describe(
          "Custom output path relative to workspace (e.g., 'videos/my-video.mp4'). If not provided, saves to 'generated/videos/'",
        ),
      duration_seconds: z
        .number()
        .min(4)
        .max(8)
        .optional()
        .describe('Video duration in seconds (default: 8)'),
      aspect_ratio: z
        .enum(['16:9', '9:16', '1:1'])
        .optional()
        .describe('Aspect ratio (default: 16:9)'),
      fast_mode: z
        .boolean()
        .optional()
        .describe('Use Veo 3.1 Fast for quicker but lower quality generation'),
    },
    async (args) => {
      try {
        const modelName = args.fast_mode
          ? 'veo-3.1-fast-generate-preview'
          : 'veo-3.1-generate-preview'

        // Build config
        const config: any = {
          aspectRatio: args.aspect_ratio || '16:9',
          durationSeconds: args.duration_seconds || 8,
        }

        // Build request parameters
        const requestParams: any = {
          model: modelName,
          prompt: args.prompt,
          config,
        }

        // Add reference image if provided
        if (args.reference_image) {
          const { data, mimeType } = await readFileAsBase64(args.reference_image)
          requestParams.image = {
            imageBytes: data,
            mimeType: mimeType,
          }
        }

        // Start video generation (async operation)
        let operation = await ai.models.generateVideos(requestParams)

        // Poll for completion (can take several minutes)
        while (!operation.done) {
          await new Promise((resolve) => setTimeout(resolve, 10000)) // Poll every 10 seconds
          operation = await ai.operations.getVideosOperation({ operation })
        }

        // Get video data and save
        const videoResult = operation.response?.generatedVideos?.[0]?.video
        if (!videoResult) {
          throw new Error('No video generated')
        }

        // Video data could be URI or bytes
        let videoData: string
        if (videoResult.videoBytes) {
          videoData = videoResult.videoBytes
        } else if (videoResult.uri) {
          // If only URI is provided, return the URI instead
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    success: true,
                    model: modelName,
                    video_uri: videoResult.uri,
                    duration_seconds: args.duration_seconds || 8,
                    aspect_ratio: args.aspect_ratio || '16:9',
                    note: 'Video available at the provided URI',
                  },
                  null,
                  2,
                ),
              },
            ],
          }
        } else {
          throw new Error('No video data in response')
        }

        const outputPath = await saveToWorkspace(
          videoData,
          args.output_path,
          'videos',
          'veo',
          '.mp4',
        )

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: true,
                  model: modelName,
                  output_path: outputPath,
                  duration_seconds: args.duration_seconds || 8,
                  aspect_ratio: args.aspect_ratio || '16:9',
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ success: false, error: error.message }, null, 2),
            },
          ],
        }
      }
    },
  ),

  // Tool 3: Imagen Generate - Image Generation
  tool(
    'imagen_generate',
    'Generate images from text prompts using Google Imagen 4. Returns paths to generated images in workspace.',
    {
      prompt: z.string().describe('Text description of the image to generate'),
      negative_prompt: z.string().optional().describe('What to avoid in the image'),
      output_path: z
        .string()
        .optional()
        .describe(
          "Custom output path relative to workspace (e.g., 'images/my-image.png'). For multiple images, a number suffix will be added. If not provided, saves to 'generated/images/'",
        ),
      aspect_ratio: z
        .enum(['1:1', '3:4', '4:3', '9:16', '16:9'])
        .optional()
        .describe('Aspect ratio (default: 1:1)'),
      number_of_images: z
        .number()
        .min(1)
        .max(4)
        .optional()
        .describe('Number of images to generate (1-4, default: 1)'),
      model: z
        .enum(['imagen-4', 'imagen-4-fast', 'imagen-4-ultra'])
        .optional()
        .describe('Model version (default: imagen-4)'),
    },
    async (args) => {
      try {
        const modelMap: Record<string, string> = {
          'imagen-4': 'imagen-4.0-generate-001',
          'imagen-4-fast': 'imagen-4.0-fast-generate-001',
          'imagen-4-ultra': 'imagen-4.0-ultra-generate-001',
        }
        const modelName = modelMap[args.model || 'imagen-4']!

        const response = await ai.models.generateImages({
          model: modelName,
          prompt: args.prompt,
          config: {
            numberOfImages: args.number_of_images || 1,
            aspectRatio: args.aspect_ratio || '1:1',
            negativePrompt: args.negative_prompt,
          },
        })

        // Save generated images
        const outputPaths: string[] = []
        const numImages = response.generatedImages?.length || 0
        for (let i = 0; i < numImages; i++) {
          const imageData = response.generatedImages![i]!.image
          if (imageData) {
            // imageData contains base64 image bytes
            const imageBytes = imageData.imageBytes
            if (imageBytes) {
              // For multiple images with custom path, add index suffix
              let customOutputPath = args.output_path
              if (customOutputPath && numImages > 1) {
                const ext = path.extname(customOutputPath) || '.png'
                const baseName = customOutputPath.replace(ext, '')
                customOutputPath = `${baseName}_${i + 1}${ext}`
              }
              const outputPath = await saveToWorkspace(
                imageBytes as string,
                customOutputPath,
                'images',
                `imagen_${i + 1}`,
                '.png',
              )
              outputPaths.push(outputPath)
            }
          }
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: true,
                  model: modelName,
                  output_paths: outputPaths,
                  count: outputPaths.length,
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ success: false, error: error.message }, null, 2),
            },
          ],
        }
      }
    },
  ),

  // Tool 4: Nano Banana Generate - Advanced Image Generation/Editing
  tool(
    'nano_banana_generate',
    'Generate or edit images using Nano Banana 2 (Gemini 3.1 Flash Image). Supports text-to-image, image editing, style transfer, up to 4K output, and subject consistency.',
    {
      prompt: z
        .string()
        .describe('Description of image to generate, or edit instructions if input_image provided'),
      input_image: z.string().optional().describe('Path to input image in workspace for editing'),
      style_reference: z
        .string()
        .optional()
        .describe('Path to style reference image for style transfer'),
      reference_images: z
        .array(z.string())
        .max(14)
        .optional()
        .describe(
          'Up to 14 additional reference image paths for subject/style consistency (10 object + 4 character max). Combined with input_image and style_reference, total parts should stay within 14.',
        ),
      output_path: z
        .string()
        .optional()
        .describe(
          "Custom output path relative to workspace (e.g., 'images/edited.png'). If not provided, saves to 'generated/nano_banana/'",
        ),
      aspect_ratio: z
        .enum(['1:1', '3:4', '4:3', '9:16', '16:9'])
        .optional()
        .describe('Aspect ratio (default: 1:1)'),
      image_size: z.enum(['1K', '2K', '4K']).optional().describe('Output resolution (default: 2K)'),
    },
    async (args) => {
      try {
        const modelName = 'gemini-3.1-flash-image-preview'

        const imagePaths: string[] = [
          ...(args.input_image ? [args.input_image] : []),
          ...(args.style_reference ? [args.style_reference] : []),
          ...(args.reference_images ?? []),
        ]

        if (imagePaths.length > 14) {
          throw new Error(`Too many reference images: ${imagePaths.length} (max 14)`)
        }

        const promptText = args.style_reference
          ? `Apply the style from the reference image(s). ${args.prompt}`
          : args.prompt

        const parts: any[] = [{ text: promptText }]
        for (const imagePath of imagePaths) {
          const { data, mimeType } = await readFileAsBase64(imagePath)
          parts.push({ inlineData: { mimeType, data } })
        }

        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts,
            },
          ],
          config: {
            responseModalities: ['TEXT', 'IMAGE'],
            imageConfig: {
              aspectRatio: args.aspect_ratio || '1:1',
              imageSize: args.image_size || '2K',
            },
          },
        })

        // Extract image from response
        const candidates = response.candidates
        if (!candidates || candidates.length === 0) {
          throw new Error('No response candidates')
        }

        const content = candidates[0]!.content
        if (!content || !content.parts) {
          throw new Error('No content in response')
        }

        // Find image part in response
        let imageData: string | undefined
        for (const part of content.parts) {
          if ((part as any).inlineData) {
            imageData = (part as any).inlineData.data
            break
          }
        }

        if (!imageData) {
          throw new Error('No image generated in response')
        }

        const outputPath = await saveToWorkspace(
          imageData,
          args.output_path,
          'nano_banana',
          'nb',
          '.png',
        )

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: true,
                  model: modelName,
                  aspect_ratio: args.aspect_ratio || '1:1',
                  image_size: args.image_size || '2K',
                  reference_image_count: imagePaths.length,
                  output_path: outputPath,
                  mode: args.input_image ? 'edit' : 'generate',
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ success: false, error: error.message }, null, 2),
            },
          ],
        }
      }
    },
  ),
]

export const googleAiToolsServer = createSdkMcpServer({
  name: 'google-ai-tools',
  version: '1.0.0',
  tools: googleAiTools,
})

export function createGoogleAiToolsServer() {
  return createSdkMcpServer({ name: 'google-ai-tools', version: '1.0.0', tools: googleAiTools })
}
