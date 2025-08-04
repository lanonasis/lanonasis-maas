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
 *           description: User's email address
 *           example: "user@example.com"
 *         password:
 *           type: string
 *           minLength: 8
 *           description: User's password (minimum 8 characters)
 *           example: "securePassword123"
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
 *           description: User's email address
 *           example: "admin@company.com"
 *         password:
 *           type: string
 *           minLength: 8
 *           description: User's password (minimum 8 characters)
 *           example: "securePassword123"
 *         organization_name:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *           description: Name of the organization to create
 *           example: "Acme Corporation"
 */
export const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    organization_name: z.string().min(2)
});
//# sourceMappingURL=auth.js.map