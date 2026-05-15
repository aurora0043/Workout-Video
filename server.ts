import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fetch from "node-fetch";

// We use global fetch which is available in Node 18+ natively.

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json());

  const getAirtableHeaders = () => {
    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN || "patJP0XEud9206yTy";
    
    if (!AIRTABLE_TOKEN || AIRTABLE_TOKEN === "在這裡貼上你的Token" || AIRTABLE_TOKEN === "") {
      throw new Error("AIRTABLE_TOKEN_MISSING");
    }
    return {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      "Content-Type": "application/json",
    };
  };

  const getAirtableBaseId = () => {
    return process.env.AIRTABLE_BASE_ID || "appxnU6olmUvwZ7Bt";
  };

  const tableUri = () => `https://api.airtable.com/v0/${getAirtableBaseId()}/Workout%20Videos`;

  // API Route: Get Videos
  app.get("/api/workout", async (req, res) => {
    try {
      const headers = getAirtableHeaders();
      const response = await fetch(tableUri(), { headers });
      if (!response.ok) {
        const text = await response.text();
        if (response.status === 401) {
          return res.status(401).json({ error: "AIRTABLE_UNAUTHORIZED", details: text });
        }
        return res.status(response.status).json({ error: "Failed to fetch from Airtable", details: text });
      }
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      if (err.message === "AIRTABLE_TOKEN_MISSING") {
        return res.status(401).json({ error: "AIRTABLE_TOKEN_MISSING" });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Update
  app.patch("/api/workout", async (req, res) => {
    try {
      const headers = getAirtableHeaders();
      const { id, isCompleted, fields } = req.body;
      if (!id) return res.status(400).json({ error: "Missing record id" });

      const updateFields = fields || { Status: isCompleted };
      const payload = {
        records: [{ id: id, fields: updateFields }]
      };

      const response = await fetch(tableUri(), {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const text = await response.text();
        if (response.status === 401) {
          return res.status(401).json({ error: "AIRTABLE_UNAUTHORIZED", details: text });
        }
        return res.status(response.status).json({ error: "Failed to update Airtable", details: text });
      }
      
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      if (err.message === "AIRTABLE_TOKEN_MISSING") {
        return res.status(401).json({ error: "AIRTABLE_TOKEN_MISSING" });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Delete
  app.delete("/api/workout/:id", async (req, res) => {
    try {
      const headers = getAirtableHeaders();
      const id = req.params.id;
      
      const response = await fetch(`${tableUri()}/${id}`, {
        method: "DELETE",
        headers
      });

      if (!response.ok) {
        const text = await response.text();
        if (response.status === 401) {
          return res.status(401).json({ error: "AIRTABLE_UNAUTHORIZED", details: text });
        }
        return res.status(response.status).json({ error: "Failed to delete from Airtable", details: text });
      }
      
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      if (err.message === "AIRTABLE_TOKEN_MISSING") {
        return res.status(401).json({ error: "AIRTABLE_TOKEN_MISSING" });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Create Video
  app.post("/api/workout", async (req, res) => {
    try {
      const headers = getAirtableHeaders();
      const fields = req.body;

      const payload = {
        records: [{ fields }]
      };

      const response = await fetch(tableUri(), {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const text = await response.text();
        if (response.status === 401) {
          return res.status(401).json({ error: "AIRTABLE_UNAUTHORIZED", details: text });
        }
        return res.status(response.status).json({ error: "Failed to create in Airtable", details: text });
      }
      
      const data = await response.json();
      res.json({ record: data.records[0] });
    } catch (err: any) {
      if (err.message === "AIRTABLE_TOKEN_MISSING") {
        return res.status(401).json({ error: "AIRTABLE_TOKEN_MISSING" });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // In Express v4 we use * 
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
