import { Database } from "bun:sqlite";

const db = new Database(":memory:"); // In-memory DB for serverless

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

interface User {
  id?: number;
  name: string;
  email: string;
  created_at?: string;
}

const queries = {
  getAllUsers: db.query("SELECT * FROM users"),
  getUserById: db.query("SELECT * FROM users WHERE id = ?"),
  createUser: db.query("INSERT INTO users (name, email) VALUES (?, ?) RETURNING *"),
  updateUser: db.query("UPDATE users SET name = ?, email = ? WHERE id = ? RETURNING *"),
  deleteUser: db.query("DELETE FROM users WHERE id = ?"),
};

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  // Root route
  if (path === "/" || path === "/api") {
    return Response.json({
      message: "Bun API on Vercel",
      bunVersion: process.versions.bun,
      endpoints: [
        "GET /api/users - Get all users",
        "GET /api/users/:id - Get user by ID",
        "POST /api/users - Create user (body: {name, email})",
        "PUT /api/users/:id - Update user (body: {name, email})",
        "DELETE /api/users/:id - Delete user"
      ]
    });
  }

  // Config endpoint
  if (path === "/config") {
    return Response.json({
      apiUrl: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"
    });
  }

  // GET /api/users
  if (path === "/api/users" && method === "GET") {
    const users = queries.getAllUsers.all();
    return Response.json(users);
  }

  // POST /api/users
  if (path === "/api/users" && method === "POST") {
    try {
      const body = await req.json() as any;

      if (!body.name || !body.email) {
        return Response.json(
          { error: "Name and email are required" },
          { status: 400 }
        );
      }

      const user = queries.createUser.get(body.name, body.email);
      return Response.json(user, { status: 201 });
    } catch (error: any) {
      if (error.message?.includes("UNIQUE")) {
        return Response.json(
          { error: "Email already exists" },
          { status: 409 }
        );
      }
      return Response.json(
        { error: "Failed to create user", message: error.message },
        { status: 500 }
      );
    }
  }

  // Match /api/users/:id routes
  const userIdMatch = path.match(/^\/api\/users\/(\d+)$/);
  if (userIdMatch) {
    const id = parseInt(userIdMatch[1]!);

    // GET /api/users/:id
    if (method === "GET") {
      const user = queries.getUserById.get(id);

      if (!user) {
        return Response.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      return Response.json(user);
    }

    // PUT /api/users/:id
    if (method === "PUT") {
      try {
        const body = await req.json() as any;

        if (!body.name || !body.email) {
          return Response.json(
            { error: "Name and email are required" },
            { status: 400 }
          );
        }

        const user = queries.updateUser.get(body.name, body.email, id);

        if (!user) {
          return Response.json(
            { error: "User not found" },
            { status: 404 }
          );
        }

        return Response.json(user);
      } catch (error: any) {
        if (error.message?.includes("UNIQUE")) {
          return Response.json(
            { error: "Email already exists" },
            { status: 409 }
          );
        }
        return Response.json(
          { error: "Failed to update user", message: error.message },
          { status: 500 }
        );
      }
    }

    // DELETE /api/users/:id
    if (method === "DELETE") {
      queries.deleteUser.run(id);
      return Response.json({ message: "User deleted successfully" });
    }
  }

  return Response.json(
    { error: "Route not found" },
    { status: 404 }
  );
}
