import { authQueries } from "../db/queries";
import { generateToken } from "../middleware/auth";
import { Elysia, t } from "elysia";
import type { CreateUserInput, LoginInput, LoginResponse, UserResponse } from "../types";

export const authRoutes = new Elysia({ prefix: "/api" })
  .post(
    "/register",
    async ({ body, set }) => {
      const { name, email, password } = body as CreateUserInput;

      try {
        const existingUser = authQueries.findUserByEmail(email);

        if (existingUser) {
          set.status = 400;
          return {
            error: "Bad Request",
            message: "Email already registered"
          };
        }

        const hashedPassword = await Bun.password.hash(password, {
          algorithm: "bcrypt"
        });

        const result = authQueries.createUser({
          name,
          email,
          password: hashedPassword
        });

        const newUser: UserResponse = {
          id: result.lastInsertRowid,
          name,
          email
        };

        set.status = 201;
        return newUser;
      } catch (error) {
        console.error("Register error:", error);
        set.status = 500;
        return {
          error: "Internal Server Error",
          message: "Failed to create user"
        };
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 6 })
      }),
      detail: {
        tags: ["Authentication"],
        summary: "Register new user",
        description: "Create a new user account with name, email, and password. Password will be hashed using bcrypt."
      }
    }
  )
  .post(
    "/login",
    async ({ body, set }) => {
      const { email, password } = body as LoginInput;

      try {
        const user = authQueries.validateUser({ email, password });

        if (!user) {
          set.status = 404;
          return {
            error: "Not Found",
            message: "User not found"
          };
        }

        const isPasswordValid = await Bun.password.verify(password, user.password);

        if (!isPasswordValid) {
          set.status = 400;
          return {
            error: "Bad Request",
            message: "Invalid credentials"
          };
        }

        const token = generateToken(user.id);

        const response: LoginResponse = {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email
          }
        };

        return response;
      } catch (error) {
        console.error("Login error:", error);
        set.status = 500;
        return {
          error: "Internal Server Error",
          message: "Login failed"
        };
      }
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String()
      }),
      detail: {
        tags: ["Authentication"],
        summary: "Login user",
        description: "Authenticate user with email and password. Returns a Bearer token for authentication."
      }
    }
  );
