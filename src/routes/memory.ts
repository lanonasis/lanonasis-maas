import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { asyncHandler } from '@/middleware/errorHandler';
import { requireRole, requirePlan } from '@/middleware/auth';
import { MemoryService, ListMemoryFilters } from '@/services/memoryService';
import { 
  createMemorySchema, 
  updateMemorySchema, 
  searchMemorySchema,
  CreateMemoryRequest,
  UpdateMemoryRequest,
  SearchMemoryRequest,
  MemoryType
} from '@/types/memory';



interface SearchMemoryFilters {
  limit?: number;
  threshold?: number;
  memory_types?: MemoryType[];
  tags?: string[];
  topic_id?: string;
  user_id?: string;
}
import { logMemoryOperation } from '@/utils/logger';

const router = Router();
const memoryService = new MemoryService();

/**
 * @swagger
 * /memory:
 *   post:
 *     summary: Create a new memory entry
 *     description: Creates a new memory entry with vector embedding
 *     tags: [Memory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMemoryRequest'
 *     responses:
 *       201:
 *         description: Memory created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MemoryEntry'
 *       400:
 *         description: Validation error
 *       403:
 *         description: Plan limit exceeded
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const validatedData = createMemorySchema.parse(req.body) as CreateMemoryRequest;
  const user = req.user;
  if (!user || !user.userId || !user.organizationId || !user.plan) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid authentication required'
    });
    return;
  }
  const { userId, organizationId, plan } = user;

  // Check plan limits
  const memoryCount = await memoryService.getMemoryCount(organizationId);
  const planLimits = {
    free: 100,
    pro: 10000,
    enterprise: Infinity
  };

  if (memoryCount >= planLimits[plan as keyof typeof planLimits]) {
    res.status(403).json({
      error: 'Plan limit exceeded',
      message: `Your ${plan} plan allows up to ${planLimits[plan as keyof typeof planLimits]} memories. Please upgrade your plan.`,
      current_count: memoryCount,
      limit: planLimits[plan as keyof typeof planLimits]
    });
    return;
  }

  const memoryId = uuidv4();
  const memory = await memoryService.createMemory(memoryId, {
    ...validatedData,
    user_id: userId,
    group_id: organizationId
  });

  logMemoryOperation('create', userId, organizationId, {
    memoryId,
    memory_type: validatedData.memory_type,
    title: validatedData.title
  });

  res.status(201).json(memory);
}));

/**
 * @swagger
 * /memory:
 *   get:
 *     summary: List memory entries
 *     description: Retrieves paginated list of memory entries for the organization
 *     tags: [Memory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: memory_type
 *         schema:
 *           type: string
 *           enum: [context, project, knowledge, reference, personal, workflow]
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *           description: Comma-separated list of tags
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [created_at, updated_at, last_accessed, title]
 *           default: created_at
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Memory entries retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 memories:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MemoryEntry'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.organizationId) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid authentication required'
    });
    return;
  }
  const { organizationId, role } = user;
  
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const memory_type = req.query.memory_type as string;
  const user_id = req.query.user_id as string;
  const tags = req.query.tags ? (req.query.tags as string).split(',') : undefined;
  const sort = (req.query.sort as string) || 'created_at';
  const order = (req.query.order as string) || 'desc';

  // Users can only see their own personal memories unless they're admin
  const filters: ListMemoryFilters = {
    organization_id: organizationId
  };

  if (memory_type && ['context', 'project', 'knowledge', 'reference', 'personal', 'workflow'].includes(memory_type)) {
    filters.memory_type = memory_type as MemoryType;
  }
  if (tags) filters.tags = tags;
  
  // Role-based filtering
  if (role !== 'admin' && user_id) {
    filters.user_id = user.userId; // Force to own memories
  } else if (user_id) {
    filters.user_id = user_id;
  }

  const result = await memoryService.listMemories(filters, {
    page,
    limit,
    sort,
    order
  });

  res.json(result);
}));

/**
 * @swagger
 * /memory/search:
 *   post:
 *     summary: Search memory entries using vector similarity
 *     description: Performs semantic search across memory entries using vector embeddings
 *     tags: [Memory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SearchMemoryRequest'
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MemorySearchResult'
 *                 query:
 *                   type: string
 *                 total_results:
 *                   type: integer
 *                 search_time_ms:
 *                   type: number
 */
router.post('/search', asyncHandler(async (req: Request, res: Response) => {
  const validatedData = searchMemorySchema.parse(req.body) as SearchMemoryRequest;
  const user = req.user;
  if (!user || !user.userId || !user.organizationId) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid authentication required'
    });
    return;
  }
  const { userId, organizationId, role } = user;

  const startTime = Date.now();
  
  // Build filters object without undefined values
  const filters: SearchMemoryFilters = {
    limit: validatedData.limit,
    threshold: validatedData.threshold
  };
  
  if (validatedData.memory_types?.length) {
    filters.memory_types = validatedData.memory_types;
  }
  
  if (validatedData.tags?.length) {
    filters.tags = validatedData.tags;
  }
  
  if (validatedData.topic_id) {
    filters.topic_id = validatedData.topic_id;
  }
  
  if (role !== 'admin') {
    filters.user_id = userId;
  }

  const results = await memoryService.searchMemories(
    validatedData.query,
    organizationId,
    filters
  );

  const searchTime = Date.now() - startTime;

  logMemoryOperation('search', userId, organizationId, {
    query: validatedData.query,
    results_count: results.length,
    search_time_ms: searchTime
  });

  res.json({
    results,
    query: validatedData.query,
    total_results: results.length,
    search_time_ms: searchTime
  });
}));

/**
 * @swagger
 * /memory/{id}:
 *   get:
 *     summary: Get a specific memory entry
 *     description: Retrieves a memory entry by ID and updates access tracking
 *     tags: [Memory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Memory entry retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MemoryEntry'
 *       404:
 *         description: Memory not found
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({
      error: 'Invalid memory ID',
      message: 'Memory ID is required'
    });
    return;
  }

  const user = req.user;
  if (!user || !user.userId || !user.organizationId) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid authentication required'
    });
    return;
  }
  const { userId, organizationId, role } = user;

  const memory = await memoryService.getMemoryById(id, organizationId);
  
  if (!memory) {
    res.status(404).json({
      error: 'Memory not found',
      message: 'The requested memory entry does not exist'
    });
    return;
  }

  // Check access permissions
  if (role !== 'admin' && memory.user_id !== userId && memory.memory_type === 'personal') {
    res.status(403).json({
      error: 'Access denied',
      message: 'You do not have permission to access this memory'
    });
    return;
  }

  // Update access tracking
  await memoryService.updateAccessTracking(id);

  logMemoryOperation('read', userId, organizationId, {
    memoryId: id,
    memory_type: memory.memory_type
  });

  res.json(memory);
}));

/**
 * @swagger
 * /memory/{id}:
 *   put:
 *     summary: Update a memory entry
 *     description: Updates an existing memory entry
 *     tags: [Memory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateMemoryRequest'
 *     responses:
 *       200:
 *         description: Memory updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MemoryEntry'
 *       404:
 *         description: Memory not found
 *       403:
 *         description: Access denied
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({
      error: 'Invalid memory ID',
      message: 'Memory ID is required'
    });
    return;
  }

  const validatedData = updateMemorySchema.parse(req.body) as UpdateMemoryRequest;
  const user = req.user;
  if (!user || !user.userId || !user.organizationId) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid authentication required'
    });
    return;
  }
  const { userId, organizationId, role } = user;

  const existingMemory = await memoryService.getMemoryById(id, organizationId);
  
  if (!existingMemory) {
    res.status(404).json({
      error: 'Memory not found',
      message: 'The requested memory entry does not exist'
    });
    return;
  }

  // Check permissions
  if (role !== 'admin' && existingMemory.user_id !== userId) {
    res.status(403).json({
      error: 'Access denied',
      message: 'You can only update your own memories'
    });
    return;
  }

  const updatedMemory = await memoryService.updateMemory(id, validatedData);

  logMemoryOperation('update', userId, organizationId, {
    memoryId: id,
    changes: Object.keys(validatedData)
  });

  res.json(updatedMemory);
}));

/**
 * @swagger
 * /memory/{id}:
 *   delete:
 *     summary: Delete a memory entry
 *     description: Permanently deletes a memory entry
 *     tags: [Memory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Memory deleted successfully
 *       404:
 *         description: Memory not found
 *       403:
 *         description: Access denied
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({
      error: 'Invalid memory ID',
      message: 'Memory ID is required'
    });
    return;
  }

  const user = req.user;
  if (!user || !user.userId || !user.organizationId) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid authentication required'
    });
    return;
  }
  const { userId, organizationId, role } = user;

  const existingMemory = await memoryService.getMemoryById(id, organizationId);
  
  if (!existingMemory) {
    res.status(404).json({
      error: 'Memory not found',
      message: 'The requested memory entry does not exist'
    });
    return;
  }

  // Check permissions
  if (role !== 'admin' && existingMemory.user_id !== userId) {
    res.status(403).json({
      error: 'Access denied',
      message: 'You can only delete your own memories'
    });
    return;
  }

  await memoryService.deleteMemory(id);

  logMemoryOperation('delete', userId, organizationId, {
    memoryId: id,
    memory_type: existingMemory.memory_type
  });

  res.status(204).send();
}));

/**
 * @swagger
 * /memory/stats:
 *   get:
 *     summary: Get memory statistics
 *     description: Retrieves memory usage statistics for the organization
 *     tags: [Memory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Memory statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MemoryStats'
 */
router.get('/admin/stats', requireRole(['admin']), asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.organizationId) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid authentication required'
    });
    return;
  }
  const { organizationId } = user;
  
  const stats = await memoryService.getMemoryStats(organizationId);
  
  res.json(stats);
}));

/**
 * @swagger
 * /memory/bulk/delete:
 *   post:
 *     summary: Bulk delete memory entries
 *     description: Deletes multiple memory entries (admin only)
 *     tags: [Memory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - memory_ids
 *             properties:
 *               memory_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 maxItems: 100
 *     responses:
 *       200:
 *         description: Bulk deletion completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deleted_count:
 *                   type: integer
 *                 failed_ids:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.post('/bulk/delete', 
  requireRole(['admin']), 
  requirePlan(['pro', 'enterprise']),
  asyncHandler(async (req: Request, res: Response) => {
    const { memory_ids } = req.body;
    const user = req.user;
    if (!user || !user.userId || !user.organizationId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Valid authentication required'
      });
      return;
    }
    const { userId, organizationId } = user;

    if (!Array.isArray(memory_ids) || memory_ids.length === 0) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'memory_ids must be a non-empty array'
      });
      return;
    }

    if (memory_ids.length > 100) {
      res.status(400).json({
        error: 'Too many items',
        message: 'Cannot delete more than 100 memories at once'
      });
      return;
    }

    const result = await memoryService.bulkDeleteMemories(memory_ids, organizationId);

    logMemoryOperation('bulk_delete', userId, organizationId, {
      requested_count: memory_ids.length,
      deleted_count: result.deleted_count,
      failed_count: result.failed_ids.length
    });

    res.json(result);
  })
);

export default router;