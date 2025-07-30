import { z } from 'zod';
/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         email:
 *           type: string
 *           format: email
 *         organization_id:
 *           type: string
 *           format: uuid
 *         role:
 *           type: string
 *           enum: [admin, user, viewer]
 *         plan:
 *           type: string
 *           enum: [free, pro, enterprise]
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */
export interface User {
    id: string;
    email: string;
    organization_id: string;
    role: 'admin' | 'user' | 'viewer';
    plan: 'free' | 'pro' | 'enterprise';
    created_at: string;
    updated_at: string;
}
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
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
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
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    organization_name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    organization_name: string;
}, {
    email: string;
    password: string;
    organization_name: string;
}>;
/**
 * @swagger
 * components:
 *   schemas:
 *     AuthResponse:
 *       type: object
 *       properties:
 *         user:
 *           $ref: '#/components/schemas/User'
 *         token:
 *           type: string
 *         expires_at:
 *           type: string
 *           format: date-time
 */
export interface AuthResponse {
    user: User;
    token: string;
    expires_at: string;
}
export interface JWTPayload {
    userId: string;
    organizationId: string;
    role: string;
    plan: string;
    iat?: number;
    exp?: number;
}
export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
//# sourceMappingURL=auth.d.ts.map