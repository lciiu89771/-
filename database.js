const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data.db");
let db = null;
async function initDB() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) { const buffer = fs.readFileSync(DB_PATH); db = new SQL.Database(buffer); }
  else { db = new SQL.Database(); }
  db.run("PRAGMA foreign_keys = ON");
  createTables(); saveDB();
}
function createTables() {
  db.run("CREATE TABLE IF NOT EXISTS employees (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, employee_id TEXT NOT NULL UNIQUE, store TEXT NOT NULL DEFAULT '', department TEXT NOT NULL DEFAULT '', position TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1)");
  db.run("CREATE TABLE IF NOT EXISTS clock_records (id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id INTEGER NOT NULL, clock_time TEXT NOT NULL, type TEXT NOT NULL CHECK(type IN ('in','out')), FOREIGN KEY (employee_id) REFERENCES employees(id))");
  db.run("CREATE TABLE IF NOT EXISTS services (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT NOT NULL CHECK(category IN ('美发','按摩','养生','足疗')), price REAL NOT NULL, commission_rate REAL NOT NULL, active INTEGER NOT NULL DEFAULT 1)");
  db.run("CREATE TABLE IF NOT EXISTS registrations (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_name TEXT NOT NULL, customer_phone TEXT NOT NULL DEFAULT '', service_id INTEGER NOT NULL, employee_id INTEGER NOT NULL, arrival_time TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY (service_id) REFERENCES services(id), FOREIGN KEY (employee_id) REFERENCES employees(id))");
}
function saveDB() { const data = db.export(); fs.writeFileSync(DB_PATH, Buffer.from(data)); }
function lastId() { return db.exec("SELECT last_insert_rowid()")[0].values[0][0]; }

function getAllEmployees() { const r=db.exec("SELECT * FROM employees WHERE active=1 ORDER BY id"); if(!r[0])return[]; return r[0].values.map(row=>({id:row[0],name:row[1],employee_id:row[2],store:row[3],department:row[4],position:row[5],active:row[6]})); }
function addEmployee(v){db.run("INSERT INTO employees(name,employee_id,store,department,position)VALUES(?,?,?,?,?)",[v.name,v.employee_id,v.store,v.department,v.position]);const id=lastId();saveDB();return{id};}
function updateEmployee(id,v){db.run("UPDATE employees SET name=?,employee_id=?,store=?,department=?,position=?WHERE id=?",[v.name,v.employee_id,v.store,v.department,v.position,id]);saveDB();}
function deleteEmployee(id){db.run("UPDATE employees SET active=0 WHERE id=?",[id]);saveDB();}

function clockInOut(eid){const t=new Date().toISOString().slice(0,10);const last=db.exec("SELECT type FROM clock_records WHERE employee_id=? AND clock_time>=? ORDER BY clock_time DESC LIMIT 1",[eid,t]);const lt=(last[0]&&last[0].values[0]&&last[0].values[0][0])||"out";const nt=lt==="out"?"in":"out";db.run("INSERT INTO clock_records(employee_id,clock_time,type)VALUES(?,datetime('now','localtime'),?)",[eid,nt]);saveDB();return{type:nt};}
function getClockHistory(eid,date){let sql="SELECT * FROM clock_records WHERE employee_id=?";const p=[eid];if(date){sql+=" AND clock_time>=? AND clock_time<date(?,'+1 day')";p.push(date,date);}sql+=" ORDER BY clock_time DESC";const r=db.exec(sql,p);if(!r[0])return[];return r[0].values.map(row=>({id:row[0],employee_id:row[1],clock_time:row[2],type:row[3]}));}
function getTodayClock(){const t=new Date().toISOString().slice(0,10);const r=db.exec("SELECT c.*,e.name FROM clock_records c LEFT JOIN employees e ON c.employee_id=e.id WHERE c.clock_time>=? AND c.clock_time<date(?,'+1 day') ORDER BY c.clock_time DESC",[t,t]);if(!r[0])return[];return r[0].values.map(row=>({id:row[0],employee_id:row[1],clock_time:row[2],type:row[3],employee_name:row[4]}));}

function getAllServices(){const r=db.exec("SELECT * FROM services WHERE active=1 ORDER BY id");if(!r[0])return[];return r[0].values.map(row=>({id:row[0],name:row[1],category:row[2],price:row[3],commission_rate:row[4],active:row[5]}));}
function addService(v){db.run("INSERT INTO services(name,category,price,commission_rate)VALUES(?,?,?,?)",[v.name,v.category,v.price,v.commission_rate]);const id=lastId();saveDB();return{id};}
function updateService(id,v){db.run("UPDATE services SET name=?,category=?,price=?,commission_rate=?WHERE id=?",[v.name,v.category,v.price,v.commission_rate,id]);saveDB();}
function deleteService(id){db.run("UPDATE services SET active=0 WHERE id=?",[id]);saveDB();}

function getRegistrations(date){let sql="SELECT r.*,s.name,s.price,e.name FROM registrations r LEFT JOIN services s ON r.service_id=s.id LEFT JOIN employees e ON r.employee_id=e.id";const p=[];if(date){sql+=" WHERE r.created_at>=? AND r.created_at<date(?,'+1 day')";p.push(date,date);}sql+=" ORDER BY r.created_at DESC";const r=db.exec(sql,p);if(!r[0])return[];return r[0].values.map(row=>({id:row[0],customer_name:row[1],customer_phone:row[2],service_id:row[3],employee_id:row[4],arrival_time:row[5],created_at:row[6],service_name:row[7],service_price:row[8],employee_name:row[9]}));}
function addRegistration(v){const n=new Date().toISOString().slice(0,19).replace("T"," ");db.run("INSERT INTO registrations(customer_name,customer_phone,service_id,employee_id,arrival_time,created_at)VALUES(?,?,?,?,?,?)",[v.customer_name,v.customer_phone,v.service_id,v.employee_id,v.arrival_time||n,n]);const id=lastId();saveDB();return{id};}
function deleteRegistration(id){db.run("DELETE FROM registrations WHERE id=?",[id]);saveDB();}

function getEmployeeStats(eid,s,e){let sql="SELECT COUNT(*),COALESCE(SUM(s.price),0),CAST(COALESCE(SUM(s.price*s.commission_rate/100.0),0)AS REAL)FROM registrations r JOIN services s ON r.service_id=s.id WHERE r.employee_id=?";const p=[eid];if(s){sql+=" AND r.created_at>=?";p.push(s);}if(e){sql+=" AND r.created_at<=?";p.push(e);}const r=db.exec(sql,p);const x=(r[0]&&r[0].values[0])||[0,0,0];return{count:x[0],total:x[1],commission:Math.round(x[2]*100)/100};}
function getAllEmployeeStats(s,e){let sql="SELECT e.id,e.name,e.employee_id,COUNT(r.id),COALESCE(SUM(s.price),0),CAST(COALESCE(SUM(s.price*s.commission_rate/100.0),0)AS REAL)FROM employees e LEFT JOIN registrations r ON e.id=r.employee_id LEFT JOIN services s ON r.service_id=s.id WHERE e.active=1";const p=[];if(s){sql+=" AND r.created_at>=?";p.push(s);}if(e){sql+=" AND r.created_at<=?";p.push(e);}sql+=" GROUP BY e.id ORDER BY e.id";const r=db.exec(sql,p);if(!r[0])return[];return r[0].values.map(row=>({id:row[0],name:row[1],employee_id:row[2],count:row[3],total:row[4],commission:Math.round(row[5]*100)/100}));}
function getCategoryStats(s,e){let sql="SELECT s.category,COUNT(*),SUM(s.price)FROM registrations r JOIN services s ON r.service_id=s.id";const p=[];const w=[];if(s){w.push("r.created_at>=?");p.push(s);}if(e){w.push("r.created_at<=?");p.push(e);}if(w.length)sql+=" WHERE "+w.join(" AND ");sql+=" GROUP BY s.category";const r=db.exec(sql,p);if(!r[0])return[];return r[0].values.map(row=>({category:row[0],count:row[1],total:row[2]}));}

function getDashboardData(){const t=new Date().toISOString().slice(0,10);const tv=(db.exec("SELECT COUNT(*)FROM registrations WHERE created_at>=? AND created_at<date(?,'+1 day')",[t,t])[0]?.values[0][0])||0;const toR=db.exec("SELECT s.name,COUNT(*)FROM registrations r JOIN services s ON r.service_id=s.id WHERE r.created_at>=? AND r.created_at<date(?,'+1 day') GROUP BY r.service_id ORDER BY COUNT(*)DESC",[t,t]);const to=(toR[0]?toR[0].values.map(r=>({name:r[0],count:r[1]})):[]);const ti=(db.exec("SELECT COUNT(DISTINCT employee_id)FROM clock_records WHERE clock_time>=? AND clock_time<date(?,'+1 day') AND type='in'",[t,t])[0]?.values[0][0])||0;const te=(db.exec("SELECT COUNT(*)FROM employees WHERE active=1")[0]?.values[0][0])||0;const tr=(db.exec("SELECT COALESCE(SUM(s.price),0)FROM registrations r JOIN services s ON r.service_id=s.id WHERE r.created_at>=? AND r.created_at<date(?,'+1 day')",[t,t])[0]?.values[0][0])||0;return{todayVisitors:tv,todayOrders:to,todayAttendance:{checkedIn:ti,total:te},todayRevenue:tr};}

module.exports={initDB,getAllEmployees,addEmployee,updateEmployee,deleteEmployee,clockInOut,getClockHistory,getTodayClock,getAllServices,addService,updateService,deleteService,getRegistrations,addRegistration,deleteRegistration,getEmployeeStats,getAllEmployeeStats,getCategoryStats,getDashboardData};