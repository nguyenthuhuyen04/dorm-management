const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const FRONTEND_URL = "http://localhost:3005";
const SCREENSHOTS_DIR = path.join(__dirname, "..", "e2e-screenshots-crud");

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function screenshot(page, stepName) {
  const filePath = path.join(
    SCREENSHOTS_DIR,
    stepName.replace(/[^a-zA-Z0-9_-]/g, "_") + ".png",
  );
  await page.screenshot({ path: filePath, fullPage: true });
  console.log("  [SCREENSHOT] " + path.basename(filePath));
}

async function loginAsAdmin(page) {
  await page.goto(FRONTEND_URL + "/login", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.fill('input[id="identifier"]', "admin");
  await page.fill('input[id="password"]', "Admin123!");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin/dashboard", { timeout: 20000 });
  await page.waitForTimeout(3000);
  console.log("  Login OK - /admin/dashboard");
}

async function goTo(page, url) {
  await page.goto(FRONTEND_URL + url, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
}

function httpRequest(method, path, token, body) {
  return new Promise(function (resolve, reject) {
    const http = require("http");
    const data = body ? JSON.stringify(body) : "";
    const options = {
      hostname: "localhost",
      port: 3000,
      path: "/api" + path,
      method: method,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
        Authorization: "Bearer " + token,
      },
    };
    const req = http.request(options, function (res) {
      let raw = "";
      res.on("data", function (chunk) {
        raw += chunk;
      });
      res.on("end", function () {
        try {
          const json = JSON.parse(raw);
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            data: json,
            status: res.statusCode,
          });
        } catch (e) {
          resolve({
            ok: false,
            data: null,
            status: res.statusCode,
            raw: raw.substring(0, 200),
          });
        }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

function getAdminToken() {
  return new Promise(function (resolve, reject) {
    const http = require("http");
    const data = JSON.stringify({ identifier: "admin", password: "Admin123!" });
    const opts = {
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/login",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };
    const req = http.request(opts, function (res) {
      let body = "";
      res.on("data", function (ch) {
        body += ch;
      });
      res.on("end", function () {
        try {
          resolve(JSON.parse(body).accessToken);
        } catch (e) {
          reject(new Error("Token parse fail: " + body.substring(0, 100)));
        }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log("\n" + "=".repeat(50));
  console.log("  ADMIN FULL CRUD E2E TEST SUITE v2");
  console.log("=".repeat(50) + "\n");

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();
  const results = [];
  const ts = Date.now();
  let token = null;

  try {
    // TEST 1: Login
    console.log("\n--- TEST 1: Admin Login ---");
    await loginAsAdmin(page);
    await screenshot(page, "01-login-dashboard");
    results.push({
      test: "1. Login Admin",
      status: page.url().includes("/admin/dashboard") ? "PASS" : "FAIL",
    });

    // TEST 2: Dashboard
    console.log("\n--- TEST 2: Dashboard Stats ---");
    const cards = await page.locator(".ant-statistic").count();
    console.log("  Stat cards: " + cards);
    await screenshot(page, "02-dashboard-stats");
    results.push({
      test: "2. Dashboard Stats",
      status: cards >= 4 ? "PASS" : "WARN",
    });

    token = await getAdminToken();
    console.log("  Token: " + (token ? "YES" : "NO"));

    // STEP: Always create a fresh manager for building test (existing ones may manage buildings)
    console.log("\n--- STEP: Create manager for buildings test ---");
    let managerId = null;
    const mgrCreate = await httpRequest("POST", "/users", token, {
      username: "mgr_" + ts,
      password: "Manager123!",
      full_name: "Manager Tester",
      email: "mgr_" + ts + "@test.com",
      phone: "0912345000",
      role: "MANAGER",
      status: "ACTIVE",
    });
    if (mgrCreate.ok) {
      managerId =
        mgrCreate.data.id || (mgrCreate.data.data && mgrCreate.data.data.id);
      console.log("  Created manager ID: " + managerId);
    }
    console.log("  Using manager ID: " + managerId);

    // ================ USERS CRUD ================
    const uName = "usr_" + ts;
    console.log("\n--- TEST 3: Users CREATE via API ---");
    const uRes = await httpRequest("POST", "/users", token, {
      username: uName,
      password: "TestPass123!",
      full_name: "Test User " + ts,
      email: uName + "@x.com",
      phone: "0912345678",
      role: "STUDENT",
      status: "ACTIVE",
    });
    const uId = uRes.ok
      ? uRes.data.id || (uRes.data.data && uRes.data.data.id)
      : null;
    console.log("  Created user ID: " + (uId || "FAIL"));
    await screenshot(page, "03-users-create-api");
    results.push({
      test: "3. Users CREATE (API)",
      status: uId ? "PASS" : "FAIL",
    });

    console.log("\n--- TEST 4: Users UI VERIFY ---");
    await goTo(page, "/admin/users");
    await page.waitForTimeout(500);
    const su = page.locator(
      'input[placeholder="T\u00EAn \u0111\u0103ng nh\u1EADp"]',
    );
    if (
      await su.isVisible().catch(function () {
        return false;
      })
    ) {
      await su.fill(uName);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(3000);
    }
    let uRows = await page.locator(".ant-table-row").count();
    console.log("  Rows: " + uRows);
    await screenshot(page, "04-users-ui-verify");
    results.push({
      test: "4. Users UI VERIFY",
      status: uRows > 0 ? "PASS" : "FAIL",
    });

    console.log("\n--- TEST 5: Users UPDATE via API ---");
    let uUpdateOk = false;
    if (uId) {
      const uUpd = await httpRequest("PUT", "/users/" + uId, token, {
        full_name: "Updated Name " + ts,
      });
      uUpdateOk = uUpd.ok;
      console.log("  Update: " + uUpd.ok + " (status: " + uUpd.status + ")");
      if (!uUpd.ok)
        console.log("  Response: " + (uUpd.raw || JSON.stringify(uUpd.data)));
    }
    results.push({
      test: "5. Users UPDATE (API)",
      status: uUpdateOk ? "PASS" : "FAIL",
    });

    console.log("\n--- TEST 6: Users DELETE via API ---");
    let uDelOk = false;
    if (uId) {
      const uDel = await httpRequest("DELETE", "/users/" + uId, token);
      uDelOk = uDel.ok;
      console.log("  Delete: " + uDel.ok);
    }
    results.push({
      test: "6. Users DELETE (API)",
      status: uDelOk ? "PASS" : "FAIL",
    });

    // ================ BUILDINGS CRUD ================
    const bName = "Toa test " + ts;
    console.log("\n--- TEST 7: Buildings CREATE via API ---");
    let bId = null;
    if (managerId) {
      const bRes = await httpRequest("POST", "/buildings", token, {
        building_name: bName,
        gender: "Male",
        manager_id: managerId,
        description: "Test building",
      });
      bId = bRes.ok
        ? bRes.data.id || (bRes.data.data && bRes.data.data.id)
        : null;
      console.log("  Created building: " + (bId ? "OK id=" + bId : "FAIL"));
      if (!bRes.ok)
        console.log("  Response: " + (bRes.raw || JSON.stringify(bRes.data)));
    } else {
      console.log("  SKIP - no manager available");
    }
    await screenshot(page, "07-buildings-create-api");
    results.push({
      test: "7. Buildings CREATE (API)",
      status: bId ? "PASS" : "FAIL",
    });

    console.log("\n--- TEST 8: Buildings UI VERIFY ---");
    await goTo(page, "/admin/buildings");
    await page.waitForTimeout(500);
    const sb = page.locator('input[placeholder="T\u00EAn t\u00F2a nh\u00E0"]');
    if (
      await sb.isVisible().catch(function () {
        return false;
      })
    ) {
      await sb.fill(bName);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(3000);
    }
    let bRows = await page.locator(".ant-table-row").count();
    console.log("  Rows: " + bRows);
    await screenshot(page, "08-buildings-ui-verify");
    results.push({
      test: "8. Buildings UI VERIFY",
      status: bRows > 0 ? "PASS" : "FAIL",
    });

    console.log("\n--- TEST 9: Buildings UPDATE via API ---");
    let bUpdOk = false;
    if (bId) {
      const bUpd = await httpRequest("PUT", "/buildings/" + bId, token, {
        description: "Updated desc",
      });
      bUpdOk = bUpd.ok;
      console.log("  Update: " + bUpd.ok);
    }
    results.push({
      test: "9. Buildings UPDATE (API)",
      status: bUpdOk ? "PASS" : "FAIL",
    });

    console.log("\n--- TEST 10: Buildings DELETE via API ---");
    let bDelOk = false;
    if (bId) {
      const bDel = await httpRequest("DELETE", "/buildings/" + bId, token);
      bDelOk = bDel.ok;
      console.log("  Delete: " + bDel.ok);
    }
    results.push({
      test: "10. Buildings DELETE (API)",
      status: bDelOk ? "PASS" : "FAIL",
    });

    // ================ REGULATIONS CRUD ================
    const rTitle = "Noi quy test " + ts;
    console.log("\n--- TEST 11: Regulations CREATE via API ---");
    const rRes = await httpRequest("POST", "/regulations", token, {
      title: rTitle,
      content: "Noi dung test",
    });
    const rId = rRes.ok
      ? rRes.data.id || (rRes.data.data && rRes.data.data.id)
      : null;
    console.log("  Created regulation ID: " + (rId || "FAIL"));
    await screenshot(page, "11-regulations-create-api");
    results.push({
      test: "11. Regulations CREATE (API)",
      status: rId ? "PASS" : "FAIL",
    });

    console.log("\n--- TEST 12: Regulations UI VERIFY ---");
    await goTo(page, "/admin/regulations");
    await page.waitForTimeout(500);
    const sr = page.locator(
      'input[placeholder="T\u00ECm ti\u00EAu \u0111\u1EC1 ho\u1EB7c n\u1ED9i dung"]',
    );
    if (
      await sr.isVisible().catch(function () {
        return false;
      })
    ) {
      await sr.fill(rTitle);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(3000);
    }
    let rRows = await page.locator(".ant-table-row").count();
    console.log("  Rows: " + rRows);
    await screenshot(page, "12-regulations-ui-verify");
    results.push({
      test: "12. Regulations UI VERIFY",
      status: rRows > 0 ? "PASS" : "FAIL",
    });

    console.log("\n--- TEST 13: Regulations UPDATE via API ---");
    let rUpdOk = false;
    if (rId) {
      const rUpd = await httpRequest("PUT", "/regulations/" + rId, token, {
        content: "Updated content",
      });
      rUpdOk = rUpd.ok;
      console.log("  Update: " + rUpd.ok);
    }
    results.push({
      test: "13. Regulations UPDATE (API)",
      status: rUpdOk ? "PASS" : "FAIL",
    });

    console.log("\n--- TEST 14: Regulations DELETE via API ---");
    let rDelOk = false;
    if (rId) {
      const rDel = await httpRequest("DELETE", "/regulations/" + rId, token);
      rDelOk = rDel.ok;
      console.log("  Delete: " + rDel.ok);
    }
    results.push({
      test: "14. Regulations DELETE (API)",
      status: rDelOk ? "PASS" : "FAIL",
    });
  } catch (error) {
    console.error("\nFAILED: " + error.message);
    await screenshot(page, "error-state");
  } finally {
    await browser.close();
  }

  // SUMMARY
  console.log("\n" + "=".repeat(50));
  console.log("TEST RESULTS SUMMARY");
  console.log("=".repeat(50));
  let passed = 0,
    failed = 0,
    warned = 0;
  for (const r of results) {
    if (r.status === "PASS") passed++;
    else if (r.status === "FAIL") failed++;
    else if (r.status === "WARN") warned++;
    console.log("  " + r.status + " | " + r.test);
  }
  console.log(
    "\n=== " +
      passed +
      " PASSED | " +
      failed +
      " FAILED | " +
      warned +
      " WARNINGS ===",
  );
  console.log("\nDone.\n");
}

runTests()
  .then(function () {
    process.exit(0);
  })
  .catch(function (e) {
    console.error(e);
    process.exit(1);
  });
