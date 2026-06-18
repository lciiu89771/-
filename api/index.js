// Vercel Serverless 适配器
// 重要限制: sql.js（SQLite）在 Vercel 无服务器环境中文件系统是临时的，
//           数据不会跨请求持久保存。每次冷启动都会重建数据库。
// 建议: 如需数据持久化，改用 Railway / Render 等支持持久存储的平台。

const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("../database");

const app = express();

// 全局初始化 Promise，确保只初始化一次
const initPromise = db.initDB().catch(err => { console.error("DB init error:", err); });

app.use(cors());
app.use(express.json());

// 确保数据库已初始化后再处理请求
app.use(async (req, res, next) => {
  try { await initPromise; } catch(e) { res.status(500).json({error:"Database init failed"}); return; }
  next();
});

// API 路由（与 server.js 一致）
app.get("/api/employees", (req, res) => { try { res.json(db.getAllEmployees()); } catch(e) { res.status(500).json({error:e.message}); } });
app.post("/api/employees", (req, res) => { try { res.json(db.addEmployee(req.body)); } catch(e) { res.status(500).json({error:e.message}); } });
app.put("/api/employees/:id", (req, res) => { try { db.updateEmployee(+req.params.id, req.body); res.json({ok:true}); } catch(e) { res.status(500).json({error:e.message}); } });
app.delete("/api/employees/:id", (req, res) => { try { db.deleteEmployee(+req.params.id); res.json({ok:true}); } catch(e) { res.status(500).json({error:e.message}); } });

app.post("/api/employees/:id/clock", (req, res) => { try { res.json(db.clockInOut(+req.params.id)); } catch(e) { res.status(500).json({error:e.message}); } });
app.get("/api/employees/:id/clock-history", (req, res) => { try { res.json(db.getClockHistory(+req.params.id, req.query.date)); } catch(e) { res.status(500).json({error:e.message}); } });
app.get("/api/clock/today", (req, res) => { try { res.json(db.getTodayClock()); } catch(e) { res.status(500).json({error:e.message}); } });

app.get("/api/services", (req, res) => { try { res.json(db.getAllServices()); } catch(e) { res.status(500).json({error:e.message}); } });
app.post("/api/services", (req, res) => { try { res.json(db.addService(req.body)); } catch(e) { res.status(500).json({error:e.message}); } });
app.put("/api/services/:id", (req, res) => { try { db.updateService(+req.params.id, req.body); res.json({ok:true}); } catch(e) { res.status(500).json({error:e.message}); } });
app.delete("/api/services/:id", (req, res) => { try { db.deleteService(+req.params.id); res.json({ok:true}); } catch(e) { res.status(500).json({error:e.message}); } });

app.get("/api/registrations", (req, res) => { try { res.json(db.getRegistrations(req.query.date)); } catch(e) { res.status(500).json({error:e.message}); } });
app.post("/api/registrations", (req, res) => { try { res.json(db.addRegistration(req.body)); } catch(e) { res.status(500).json({error:e.message}); } });
app.delete("/api/registrations/:id", (req, res) => { try { db.deleteRegistration(+req.params.id); res.json({ok:true}); } catch(e) { res.status(500).json({error:e.message}); } });

app.get("/api/stats/employee/:id", (req, res) => { try { res.json(db.getEmployeeStats(+req.params.id, req.query.start, req.query.end)); } catch(e) { res.status(500).json({error:e.message}); } });
app.get("/api/stats/employees", (req, res) => { try { res.json(db.getAllEmployeeStats(req.query.start, req.query.end)); } catch(e) { res.status(500).json({error:e.message}); } });
app.get("/api/stats/categories", (req, res) => { try { res.json(db.getCategoryStats(req.query.start, req.query.end)); } catch(e) { res.status(500).json({error:e.message}); } });
app.get("/api/dashboard", (req, res) => { try { res.json(db.getDashboardData()); } catch(e) { res.status(500).json({error:e.message}); } });

module.exports = app;