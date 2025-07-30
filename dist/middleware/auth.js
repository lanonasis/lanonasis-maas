import jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import { logger } from '../utils/logger';
export const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const apiKey = req.headers['x-api-key'];
        let token;
        // Check for Bearer token
        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
        // Check for API key
        else if (apiKey) {
            // For API key authentication, we'll implement a separate flow
            // For now, treat API key as a special token
            token = apiKey;
        }
        if (!token) {
            res.status(401).json({
                error: 'Authentication required',
                message: 'Please provide a valid Bearer token or API key'
            });
            return;
        }
        try {
            // Verify JWT token
            const decoded = jwt.verify(token, config.JWT_SECRET=REDACTED_JWT_SECRET
            // Add user info to request
            req.user = decoded;
            logger.debug('User authenticated', {
                userId: decoded.userId,
                organizationId: decoded.organizationId,
                role: decoded.role
            });
            next();
        }
        catch (jwtError) {
            logger.warn('Invalid token provided', {
                error: jwtError instanceof Error ? jwtError.message : 'Unknown error',
                token: token.substring(0, 20) + '...'
            });
            res.status(401).json({
                error: 'Invalid token',
                message: 'The provided token is invalid or expired'
            });
            return;
        }
    }
    catch (error) {
        logger.error('Authentication middleware error', { error });
        res.status(500).json({
            error: 'Authentication error',
            message: 'An error occurred during authentication'
        });
        return;
    }
};
export const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                error: 'Authentication required',
                message: 'User not authenticated'
            });
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                error: 'Insufficient permissions',
                message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`
            });
            return;
        }
        next();
    };
};
export const requirePlan = (allowedPlans) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                error: 'Authentication required',
                message: 'User not authenticated'
            });
            return;
        }
        if (!allowedPlans.includes(req.user.plan)) {
            res.status(403).json({
                error: 'Plan upgrade required',
                message: `This feature requires one of the following plans: ${allowedPlans.join(', ')}`
            });
            return;
        }
        next();
    };
};
//# sourceMappingURL=auth.js.map