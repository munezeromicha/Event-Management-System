import app from "./app";
import dotenv from "dotenv";
import express from "express";
import path from "path";

dotenv.config();

const PORT = process.env.PORT || 3000;

// Add static file serving
app.use(express.static(path.join(__dirname, '..', 'public')));

// Make sure the "/badges" route serves static files too
app.use('/badges', express.static(path.join(__dirname, '..', 'public', 'badges')));

app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});
