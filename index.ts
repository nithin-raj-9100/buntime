import { Database } from "bun:sqlite";

const PORT = process.env.PORT || 3000;
const API_URL = process.env.API_URL || `http://localhost:${PORT}`;

const db = new Database("app.db", { create: true });

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

const server = Bun.serve({
  port: PORT,

  routes: {
    // Serve HTML page
    "/": new Response(Bun.file("./index.html")),

    // Serve JavaScript file
    "/app.js": new Response(Bun.file("./app.js")),

    // Config endpoint for frontend
    "/config": Response.json({ apiUrl: API_URL }),

    // GET /users - Get all users
    "/users": {
      GET: () => {
        const users = queries.getAllUsers.all();
        return Response.json(users);
      },

      // POST /users - Create new user
      POST: async (req) => {
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
      },
    },

    "/users/:id": {
      GET: (req) => {
        const id = parseInt(req.params.id);
        const user = queries.getUserById.get(id);

        if (!user) {
          return Response.json(
            { error: "User not found" },
            { status: 404 }
          );
        }

        return Response.json(user);
      },

      PUT: async (req) => {
        try {
          const id = parseInt(req.params.id);
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
      },

      DELETE: (req) => {
        const id = parseInt(req.params.id);
        queries.deleteUser.run(id);

        return Response.json({ message: "User deleted successfully" });
      },
    },
  },

  fetch(_req) {
    return Response.json(
      { error: "Route not found" },
      { status: 404 }
    );
  },
});

console.log(`=� Server running at http://localhost:${server.port}`);
console.log(`\n📱 Web Interface: http://localhost:${server.port}`);
console.log(`\nAPI Endpoints:`);
console.log(`  GET    /users       - Get all users`);
console.log(`  GET    /users/:id   - Get user by ID`);
console.log(`  POST   /users       - Create new user (body: {name, email})`);
console.log(`  PUT    /users/:id   - Update user (body: {name, email})`);
console.log(`  DELETE /users/:id   - Delete user`);
