import { z } from 'zod';
/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 8
 */
export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8)
});
/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - organization_name
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 8
 *         organization_name:
 *           type: string
 *           minLength: 2
 */
export const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    organization_name: z.string().min(2)
});
//# sourceMappingURL=auth.js.map