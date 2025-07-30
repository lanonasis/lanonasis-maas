import request from 'supertest';
import { app } from '@/server';

describe('Authentication Integration Tests', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'testpassword123',
    organization_name: 'Test Organization'
  };

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('expires_at');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.role).toBe('admin');
      expect(response.body.user.plan).toBe('free');
    });

    it('should reject registration with invalid email', async () => {
      const invalidUser = {
        ...testUser,
        email: 'invalid-email'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidUser)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject registration with short password', async () => {
      const invalidUser = {
        ...testUser,
        password: '123'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidUser)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject registration with missing organization name', async () => {
      const invalidUser = {
        email: testUser.email,
        password: testUser.password
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidUser)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let registeredUser: any;

    beforeAll(async () => {
      // Register a user for login tests
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);
      
      registeredUser = response.body;
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject login with malformed email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid-email',
          password: testUser.password
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let authToken: string;

    beforeAll(async () => {
      // Register and login to get a token
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          email: 'refresh@example.com'
        });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'refresh@example.com',
          password: testUser.password
        });

      authToken = loginResponse.body.token;
    });

    it('should refresh token with valid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('expires_at');
      expect(response.body.token).not.toBe(authToken); // Should be a new token
    });

    it('should reject refresh without token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Protected Route Access', () => {
    let authToken: string;

    beforeAll(async () => {
      // Register and login to get a token
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          email: 'protected@example.com'
        });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'protected@example.com',
          password: testUser.password
        });

      authToken = loginResponse.body.token;
    });

    it('should allow access to protected routes with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/memory')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('memories');
    });

    it('should deny access to protected routes without token', async () => {
      const response = await request(app)
        .get('/api/v1/memory')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should deny access to protected routes with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/memory')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});