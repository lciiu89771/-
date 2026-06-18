// ========== Navigation ==========
document.querySelectorAll(".nav-item").forEach(el => {
  el.addEventListener("click", e => {
    e.preventDefault();
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    el.classList.add("active");
    const tab = el.dataset.tab;
    document.getElementById("page-" + tab).classList.add("active");
    renderers[tab]?.();
  });
});

// ========== API Helpers ==========
const api = {
  async get(url) { const r = await fetch(url); return r.json(); },
  async post(url, body) { const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return r.json(); },
  async put(url, body) { const r = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return r.json(); },
  async del(url) { const r = await fetch(url, { method: "DELETE" }); return r.json(); }
};

// ========== Modal ==========
function showModal(html) {
  document.getElementById("modal-content").innerHTML = html;
  document.getElementById("modal-overlay").classList.remove("hidden");
}
function closeModal() {
  document.getElementById("modal-overlay").classList.add("hidden");
}
document.getElementById("modal-overlay").addEventListener("click", e => {
  if (e.target === e.currentTarget) closeModal();
});
function todayStr() { return new Date().toISOString().slice(0, 10); }

// ========== Renderers Map ==========
const renderers = {};

// ===== 1. Dashboard =====
renderers.dashboard = async function() {
  const data = await api.get("/api/dashboard");
  const el = document.getElementById("page-dashboard");
  const attRate = data.todayAttendance.total > 0
    ? Math.round(data.todayAttendance.checkedIn / data.todayAttendance.total * 100) : 0;
  el.innerHTML = `
    <h2 style="margin-bottom:20px;font-size:18px;">今日门店看板 <span style="font-size:13px;color:var(--text-secondary);font-weight:400;">${todayStr()}</span></h2>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">今日到店人数</div><div class="stat-value">${data.todayVisitors}</div><div class="stat-sub">位顾客</div></div>
      <div class="stat-card"><div class="stat-label">今日营收</div><div class="stat-value">¥${data.todayRevenue.toFixed(0)}</div><div class="stat-sub">元</div></div>
      <div class="stat-card"><div class="stat-label">员工出勤</div><div class="stat-value">${data.todayAttendance.checkedIn}/${data.todayAttendance.total}</div><div class="stat-sub">出勤率 ${attRate}%</div></div>
      <div class="stat-card"><div class="stat-label">服务订单量</div><div class="stat-value">${data.todayOrders.reduce((a,b) => a + b.count, 0)}</div><div class="stat-sub">单</div></div>
    </div>
    <div class="card">
      <div class="card-header"><h2>各项目订单量</h2></div>
      <div class="card-body">
        ${data.todayOrders.length === 0 ? '<div class="empty-state">暂无今日订单数据</div>' : `
        <table><thead><tr><th>项目名称</th><th>订单数</th></tr></thead><tbody>
          ${data.todayOrders.map(o => `<tr><td>${o.name}</td><td><strong>${o.count}</strong> 单</td></tr>`).join("")}
        </tbody></table>`}
      </div>
    </div>
    ${data.todayOrders.length > 0 ? `
    <div class="card">
      <div class="card-header"><h2>订单占比</h2></div>
      <div class="card-body">
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${(() => { const total = data.todayOrders.reduce((a,b) => a + b.count, 0); return data.todayOrders.map(o =>
            `<div style="flex:1;min-width:120px;text-align:center;padding:12px;background:var(--bg);border-radius:6px;">
              <div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">${o.name}</div>
              <div style="font-size:22px;font-weight:700;">${Math.round(o.count/total*100)}%</div>
            </div>`
          ).join(""); })()}
        </div>
      </div>
    </div>` : ""}
  `;
};

// ===== 2. Employees =====
renderers.employees = async function() {
  const employees = await api.get("/api/employees");
  const clockToday = await api.get("/api/clock/today");
  const el = document.getElementById("page-employees");
  const clockedIds = new Set(clockToday.filter(c => c.type === "in").map(c => c.employee_id));
  el.innerHTML = `
    <div class="toolbar" style="margin-bottom:16px;">
      <h2 style="font-size:18px;">员工管理</h2>
      <button class="btn btn-primary" onclick="showEmployeeForm()">+ 添加员工</button>
    </div>
    <div class="card">
      <div class="card-body">
        ${employees.length === 0 ? '<div class="empty-state">暂无员工，请添加</div>' : `
        <div class="table-wrap"><table>
          <thead><tr>
            <th>工号</th><th>姓名</th><th>门店/部门</th><th>岗位</th><th>状态</th><th>操作</th>
          </tr></thead><tbody>
          ${employees.map(e => `
            <tr>
              <td>${e.employee_id}</td>
              <td><strong>${e.name}</strong></td>
              <td>${e.store}${e.department ? " · " + e.department : ""}</td>
              <td>${e.position}</td>
              <td>${clockedIds.has(e.id) ? '<span class="tag tag-in">在岗</span>' : '<span class="tag tag-out">未打卡</span>'}</td>
              <td>
                <div class="action-cell">
                  <button class="btn btn-success btn-sm" onclick="clockEmp(${e.id})">打卡</button>
                  <button class="btn btn-outline btn-sm" onclick="showClockHistory(${e.id},'${e.name}')">记录</button>
                  <button class="btn btn-outline btn-sm" onclick="showEmployeeForm(${e.id})">编辑</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteEmp(${e.id})">删除</button>
                </div>
              </td>
            </tr>
          `).join("")}
          </tbody></table></div>`}
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h2>今日打卡记录</h2></div>
      <div class="card-body" id="clock-today-list">
        ${clockToday.length === 0 ? '<div class="empty-state">暂无今日打卡记录</div>' : `
        <div class="table-wrap"><table>
          <thead><tr><th>员工</th><th>时间</th><th>类型</th></tr></thead><tbody>
          ${clockToday.map(c => `<tr>
            <td>${c.employee_name}</td>
            <td>${c.clock_time}</td>
            <td><span class="tag ${c.type === "in" ? "tag-in" : "tag-out"}">${c.type === "in" ? "上班" : "下班"}</span></td>
          </tr>`).join("")}
          </tbody></table></div>`}
      </div>
    </div>
  `;
};

window.showEmployeeForm = async function(id) {
  let emp = { name: "", employee_id: "", store: "", department: "", position: "" };
  if (id) {
    const list = await api.get("/api/employees");
    emp = list.find(e => e.id === id) || emp;
  }
  showModal(`
    <h3>${id ? "编辑员工" : "添加员工"}</h3>
    <div class="form-group"><label>姓名</label><input class="form-control" id="f-emp-name" value="${emp.name}"></div>
    <div class="form-group"><label>工号</label><input class="form-control" id="f-emp-id" value="${emp.employee_id}"></div>
    <div class="form-row">
      <div class="form-group"><label>门店</label><input class="form-control" id="f-emp-store" value="${emp.store}"></div>
      <div class="form-group"><label>部门</label><input class="form-control" id="f-emp-dept" value="${emp.department}"></div>
    </div>
    <div class="form-group"><label>岗位</label><input class="form-control" id="f-emp-pos" value="${emp.position}"></div>
    <div class="form-actions">
      <button class="btn btn-outline" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="saveEmployee(${id || ""})">保存</button>
    </div>
  `);
};

window.saveEmployee = async function(id) {
  const data = {
    name: document.getElementById("f-emp-name").value.trim(),
    employee_id: document.getElementById("f-emp-id").value.trim(),
    store: document.getElementById("f-emp-store").value.trim(),
    department: document.getElementById("f-emp-dept").value.trim(),
    position: document.getElementById("f-emp-pos").value.trim()
  };
  if (!data.name || !data.employee_id) { alert("姓名和工号必填"); return; }
  if (id) await api.put("/api/employees/" + id, data);
  else await api.post("/api/employees", data);
  closeModal();
  renderers.employees();
};

window.deleteEmp = async function(id) {
  if (!confirm("确认删除该员工？")) return;
  await api.del("/api/employees/" + id);
  renderers.employees();
};

window.clockEmp = async function(id) {
  await api.post("/api/employees/" + id + "/clock");
  renderers.employees();
};

window.showClockHistory = async function(id, name) {
  const records = await api.get("/api/employees/" + id + "/clock-history");
  showModal(`
    <h3>${name} - 打卡记录</h3>
    ${records.length === 0 ? '<div class="empty-state">暂无打卡记录</div>' : `
    <div class="table-wrap"><table>
      <thead><tr><th>时间</th><th>类型</th></tr></thead><tbody>
      ${records.map(r => `<tr>
        <td>${r.clock_time}</td>
        <td><span class="tag ${r.type === "in" ? "tag-in" : "tag-out"}">${r.type === "in" ? "上班" : "下班"}</span></td>
      </tr>`).join("")}
      </tbody></table></div>`}
    <div class="form-actions"><button class="btn btn-outline" onclick="closeModal()">关闭</button></div>
  `);
};

// ===== 3. Services =====
renderers.services = async function() {
  const services = await api.get("/api/services");
  const el = document.getElementById("page-services");
  const catMap = { "美发": "tag-beauty", "按摩": "tag-massage", "养生": "tag-wellness", "足疗": "tag-foot" };
  el.innerHTML = `
    <div class="toolbar" style="margin-bottom:16px;">
      <h2 style="font-size:18px;">服务项目管理</h2>
      <button class="btn btn-primary" onclick="showServiceForm()">+ 添加项目</button>
    </div>
    <div class="card">
      <div class="card-body">
        ${services.length === 0 ? '<div class="empty-state">暂无服务项目，请添加</div>' : `
        <div class="table-wrap"><table>
          <thead><tr><th>名称</th><th>分类</th><th>单价</th><th>提成比例</th><th>操作</th></tr></thead><tbody>
          ${services.map(s => `
            <tr>
              <td><strong>${s.name}</strong></td>
              <td><span class="tag ${catMap[s.category] || ""}">${s.category}</span></td>
              <td>¥${s.price.toFixed(2)}</td>
              <td>${s.commission_rate}%</td>
              <td>
                <div class="action-cell">
                  <button class="btn btn-outline btn-sm" onclick="showServiceForm(${s.id})">编辑</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteService(${s.id})">删除</button>
                </div>
              </td>
            </tr>
          `).join("")}
          </tbody></table></div>`}
      </div>
    </div>
  `;
};

window.showServiceForm = async function(id) {
  let svc = { name: "", category: "美发", price: "", commission_rate: "" };
  if (id) {
    const list = await api.get("/api/services");
    svc = list.find(s => s.id === id) || svc;
  }
  showModal(`
    <h3>${id ? "编辑服务项目" : "添加服务项目"}</h3>
    <div class="form-group"><label>项目名称</label><input class="form-control" id="f-svc-name" value="${svc.name}"></div>
    <div class="form-group"><label>分类</label>
      <select class="form-control" id="f-svc-cat">
        ${["美发","按摩","养生","足疗"].map(c => `<option value="${c}" ${svc.category === c ? "selected" : ""}>${c}</option>`).join("")}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group"><label>单价 (元)</label><input type="number" step="0.01" min="0" class="form-control" id="f-svc-price" value="${svc.price}"></div>
      <div class="form-group"><label>提成比例 (%)</label><input type="number" step="0.1" min="0" max="100" class="form-control" id="f-svc-rate" value="${svc.commission_rate}"></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-outline" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="saveService(${id || ""})">保存</button>
    </div>
  `);
};

window.saveService = async function(id) {
  const data = {
    name: document.getElementById("f-svc-name").value.trim(),
    category: document.getElementById("f-svc-cat").value,
    price: parseFloat(document.getElementById("f-svc-price").value) || 0,
    commission_rate: parseFloat(document.getElementById("f-svc-rate").value) || 0
  };
  if (!data.name) { alert("项目名称必填"); return; }
  if (id) await api.put("/api/services/" + id, data);
  else await api.post("/api/services", data);
  closeModal();
  renderers.services();
};

window.deleteService = async function(id) {
  if (!confirm("确认删除该服务项目？")) return;
  await api.del("/api/services/" + id);
  renderers.services();
};

// ===== 4. Registrations =====
renderers.registrations = async function() {
  const date = document.getElementById("reg-filter-date")?.value || todayStr();
  const [registrations, employees, services] = await Promise.all([
    api.get("/api/registrations?date=" + date),
    api.get("/api/employees"),
    api.get("/api/services")
  ]);
  const el = document.getElementById("page-registrations");
  el.innerHTML = `
    <div class="toolbar" style="margin-bottom:16px;">
      <h2 style="font-size:18px;">顾客登记</h2>
      <button class="btn btn-primary" onclick="showRegistrationForm()">+ 新登记</button>
    </div>
    <div class="card">
      <div class="card-header">
        <h2>今日登记记录</h2>
        <div class="filter-bar">
          <input type="date" class="form-control" id="reg-filter-date" value="${date}" style="width:auto;" onchange="renderers.registrations()">
        </div>
      </div>
      <div class="card-body">
        ${registrations.length === 0 ? '<div class="empty-state">暂无登记记录</div>' : `
        <div class="table-wrap"><table>
          <thead><tr>
            <th>顾客姓名</th><th>手机号</th><th>服务项目</th><th>服务员工</th><th>到店时间</th><th>登记时间</th><th>金额</th><th>操作</th>
          </tr></thead><tbody>
          ${registrations.map(r => `
            <tr>
              <td><strong>${r.customer_name}</strong></td>
              <td>${r.customer_phone || "-"}</td>
              <td>${r.service_name}</td>
              <td>${r.employee_name}</td>
              <td>${r.arrival_time}</td>
              <td style="font-size:12px;color:var(--text-secondary);">${r.created_at}</td>
              <td>¥${r.service_price}</td>
              <td><button class="btn btn-danger btn-sm" onclick="deleteRegistration(${r.id})">删除</button></td>
            </tr>
          `).join("")}
          </tbody></table></div>`}
      </div>
    </div>
  `;
  window._regEmps = employees;
  window._regSvcs = services;
};

window.showRegistrationForm = function() {
  const employees = window._regEmps || [];
  const services = window._regSvcs || [];
  showModal(`
    <h3>顾客到店登记</h3>
    <div class="form-row">
      <div class="form-group"><label>顾客姓名</label><input class="form-control" id="f-reg-name"></div>
      <div class="form-group"><label>手机号</label><input class="form-control" id="f-reg-phone"></div>
    </div>
    <div class="form-group"><label>服务项目</label>
      <select class="form-control" id="f-reg-service">
        <option value="">请选择</option>
        ${services.map(s => `<option value="${s.id}">${s.name} (¥${s.price})</option>`).join("")}
      </select>
    </div>
    <div class="form-group"><label>服务员工</label>
      <select class="form-control" id="f-reg-emp">
        <option value="">请选择</option>
        ${employees.map(e => `<option value="${e.id}">${e.name} (${e.position})</option>`).join("")}
      </select>
    </div>
    <div class="form-group"><label>到店时间</label><input type="datetime-local" class="form-control" id="f-reg-time"></div>
    <div class="form-actions">
      <button class="btn btn-outline" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="saveRegistration()">登记</button>
    </div>
  `);
};

window.saveRegistration = async function() {
  const data = {
    customer_name: document.getElementById("f-reg-name").value.trim(),
    customer_phone: document.getElementById("f-reg-phone").value.trim(),
    service_id: parseInt(document.getElementById("f-reg-service").value),
    employee_id: parseInt(document.getElementById("f-reg-emp").value),
    arrival_time: document.getElementById("f-reg-time").value
  };
  if (!data.customer_name || !data.service_id || !data.employee_id) { alert("请填写必填信息"); return; }
  await api.post("/api/registrations", data);
  closeModal();
  renderers.registrations();
};

window.deleteRegistration = async function(id) {
  if (!confirm("确认删除该登记记录？")) return;
  await api.del("/api/registrations/" + id);
  renderers.registrations();
};

// ===== 5. Stats =====
renderers.stats = async function() {
  const start = document.getElementById("stats-start")?.value || "";
  const end = document.getElementById("stats-end")?.value || "";
  const [employees, categoryStats] = await Promise.all([
    api.get("/api/stats/employees?start=" + start + "&end=" + end),
    api.get("/api/stats/categories?start=" + start + "&end=" + end)
  ]);
  const totalRegs = employees.reduce((a, e) => a + e.count, 0);
  const totalRevenue = employees.reduce((a, e) => a + e.total, 0);
  const totalCommission = employees.reduce((a, e) => a + e.commission, 0);
  const el = document.getElementById("page-stats");
  el.innerHTML = `
    <div class="toolbar" style="margin-bottom:16px;">
      <h2 style="font-size:18px;">绩效统计</h2>
      <div class="filter-bar">
        <label style="font-size:13px;color:var(--text-secondary);">开始</label>
        <input type="date" id="stats-start" value="${start}" onchange="renderers.stats()">
        <label style="font-size:13px;color:var(--text-secondary);">结束</label>
        <input type="date" id="stats-end" value="${end}" onchange="renderers.stats()">
        <button class="btn btn-outline btn-sm" onclick="document.getElementById('stats-start').value='';document.getElementById('stats-end').value='';renderers.stats()">清除</button>
      </div>
    </div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">总服务人次</div><div class="stat-value">${totalRegs}</div></div>
      <div class="stat-card"><div class="stat-label">总成交金额</div><div class="stat-value">¥${totalRevenue.toFixed(0)}</div></div>
      <div class="stat-card"><div class="stat-label">总应发提成</div><div class="stat-value">¥${totalCommission.toFixed(0)}</div></div>
    </div>
    <div class="card">
      <div class="card-header"><h2>员工绩效排名</h2></div>
      <div class="card-body">
        ${employees.length === 0 ? '<div class="empty-state">暂无数据</div>' : `
        <div class="table-wrap"><table>
          <thead><tr><th>排名</th><th>员工</th><th>工号</th><th>服务次数</th><th>成交金额</th><th>应得提成</th></tr></thead><tbody>
          ${employees.sort((a,b) => b.count - a.count).map((e,i) => `
            <tr>
              <td>${i + 1}</td>
              <td><strong>${e.name}</strong></td>
              <td>${e.employee_id}</td>
              <td>${e.count} 次</td>
              <td>¥${e.total.toFixed(0)}</td>
              <td>¥${e.commission.toFixed(0)}</td>
            </tr>
          `).join("")}
          </tbody></table></div>`}
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h2>项目分类统计</h2></div>
      <div class="card-body">
        ${categoryStats.length === 0 ? '<div class="empty-state">暂无数据</div>' : `
        <div class="table-wrap"><table>
          <thead><tr><th>分类</th><th>服务次数</th><th>成交金额</th></tr></thead><tbody>
          ${categoryStats.map(c => `
            <tr>
              <td><strong>${c.category}</strong></td>
              <td>${c.count} 次</td>
              <td>¥${c.total.toFixed(0)}</td>
            </tr>
          `).join("")}
          </tbody></table></div>`}
      </div>
    </div>
  `;
};

// ========== Init ==========
document.addEventListener("DOMContentLoaded", () => {
  // Load default tab (dashboard)
  renderers.dashboard();
});
