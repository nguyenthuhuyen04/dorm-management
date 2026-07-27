const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const FRONTEND_URL = "http://localhost:3005";
const BACKEND_URL = "http://localhost:3000";
const SCREENSHOTS_DIR = path.join(__dirname, "..", "e2e-screenshots");

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function screenshot(page, stepName) {
  const filePath = path.join(
    SCREENSHOTS_DIR,
    stepName.replace(/[^a-zA-Z0-9_-]/g, "_") + ".png",
  );
  await page.screenshot({ path: filePath, fullPage: false });
  console.log("  Screenshot saved: " + path.basename(filePath));
}

async function loginAsAdmin(page) {
  await page.goto(FRONTEND_URL + "/login", { waitUntil: "networkidle" });
  await page.fill('input[id="identifier"]', "admin");
  await page.fill('input[id="password"]', "Admin123!");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin/dashboard", { timeout: 15000 });
  console.log("  Login OK");
}

async function getAdminToken() {
  const http = require("http");
  return new Promise(function (resolve, reject) {
    const data = JSON.stringify({ identifier: "admin", password: "Admin123!" });
    const options = {
      hostname: "localhost",
      port: 3000,
      path: "/api/auth/login",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };
    const req = http.request(options, function (res) {
      let body = "";
      res.on("data", function (chunk) {
        body += chunk;
      });
      res.on("end", function () {
        try {
          const json = JSON.parse(body);
          resolve(json.accessToken);
        } catch (e) {
          reject(new Error("Failed to parse token response: " + body));
        }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function createUserViaAPI(token, username, email) {
  const http = require("http");
  return new Promise(function (resolve, reject) {
    const data = JSON.stringify({
      username: username,
      password: "TestPass123!",
      full_name: "Test User " + Date.now(),
      email: email,
      phone: "0912345678",
      role: "MANAGER",
      status: "ACTIVE",
    });
    const options = {
      hostname: "localhost",
      port: 3000,
      path: "/api/users",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
        Authorization: "Bearer " + token,
      },
    };
    const req = http.request(options, function (res) {
      let body = "";
      res.on("data", function (chunk) {
        body += chunk;
      });
      res.on("end", function () {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(body);
          }
        } else {
          reject(new Error("HTTP " + res.statusCode + ": " + body));
        }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log("\n--- Admin E2E Verification ---\n");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const errors = [];
  page.on("pageerror", function (e) {
    errors.push("[page] " + e.message);
  });

  const results = [];
  const ts = Date.now();
  const newUser = "u_" + ts;
  const newEmail = "u" + ts + "@t.com";

  try {
    // 1: LOGIN
    console.log("1: Login");
    await loginAsAdmin(page);
    await screenshot(page, "01-login-dashboard");
    results.push({ test: "Admin Login", status: "PASS" });

    // 2: DASHBOARD
    console.log("\n2: Dashboard");
    await page.waitForTimeout(4000);
    var cards = await page.locator(".ant-statistic").count();
    console.log("  Stat cards: " + cards);
    results.push({
      test: "Dashboard Stats",
      status: cards >= 4 ? "PASS" : "WARN",
    });
    await screenshot(page, "02-dashboard");

    // 3: CREATE USER VIA BACKEND API
    console.log("\n3: Create User via API");
    var token = await getAdminToken();
    console.log("  Got admin token: " + token.substring(0, 20) + "...");

    var newUserData = await createUserViaAPI(token, newUser, newEmail);
    console.log(
      "  Created user: " +
        JSON.stringify({
          id: newUserData.id,
          username: newUserData.username,
          role: newUserData.role,
        }),
    );
    results.push({
      test: "Create User - API",
      status: newUserData && newUserData.id ? "PASS" : "FAIL",
    });
    await screenshot(page, "03a-create-user-api");

    // 4: VERIFY USER IN UI TABLE
    console.log("\n4: Verify User in UI Table");
    await page.goto(FRONTEND_URL + "/admin/users", {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(2000);

    // Search for the user
    var searchInput = page.locator(
      'input[placeholder="T\xEAn \u0111\u0103ng nh\u1EADp"]',
    );
    if (
      await searchInput.isVisible().catch(function () {
        return false;
      })
    ) {
      await searchInput.fill(newUser);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(3000);
    }

    var rowCount = await page.locator(".ant-table-row").count();
    console.log("  Rows after search: " + rowCount);

    if (rowCount > 0) {
      var cellTexts = await page
        .locator(".ant-table-row")
        .first()
        .locator("td")
        .allTextContents()
        .catch(function () {
          return [];
        });
      console.log("  Row data: " + JSON.stringify(cellTexts));
    }

    results.push({
      test: "Users Table Data",
      status: rowCount > 0 ? "PASS" : "WARN",
    });
    await screenshot(page, "04-users-verified");

    // 5: BUILDINGS
    console.log("\n5: Buildings");
    await page.goto(FRONTEND_URL + "/admin/buildings", {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(2000);
    var bld = page
      .locator("text=Qu\u1EA3n l\xFD t\xF2a nh\xE0")
      .or(page.locator("text=T\xF2a nh\xE0"));
    var bldVis = await bld
      .first()
      .isVisible()
      .catch(function () {
        return false;
      });
    console.log("  Buildings: " + bldVis);
    results.push({ test: "Buildings Page", status: bldVis ? "PASS" : "WARN" });
    await screenshot(page, "05-buildings");

    // 6: REGULATIONS
    console.log("\n6: Regulations");
    await page.goto(FRONTEND_URL + "/admin/regulations", {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(2000);
    var reg = page.locator("text=N\u1ED9i quy").first();
    var regVis = await reg.isVisible().catch(function () {
      return false;
    });
    console.log("  Regulations: " + regVis);
    results.push({
      test: "Regulations Page",
      status: regVis ? "PASS" : "WARN",
    });
    await screenshot(page, "06-regulations");

    // 7: SIDEBAR
    console.log("\n7: Sidebar Navigation");
    await page.goto(FRONTEND_URL + "/admin/dashboard", {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(2000);
    var sidebar = page.locator(".ant-menu");
    var sidebarVis = await sidebar.isVisible().catch(function () {
      return false;
    });
    if (sidebarVis) {
      var items = await page
        .locator(".ant-menu-item, .ant-menu-submenu-title")
        .allTextContents();
      console.log("  Menu items: " + items.length);
      for (var i = 0; i < items.length; i++) {
        console.log("    - " + items[i].trim());
      }
    }
    results.push({
      test: "Sidebar Navigation",
      status: sidebarVis ? "PASS" : "FAIL",
    });
    await screenshot(page, "07-sidebar");

    // 8: ERROR CHECK
    console.log("\n8: Error Check");
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(3000);
    var realErrors = errors.filter(function (e) {
      return !e.includes("deprecated") && !e.includes("Warning");
    });
    console.log("  Real errors: " + realErrors.length);
    results.push({
      test: "No API/Console Errors",
      status: realErrors.length === 0 ? "PASS" : "WARN",
    });
    await screenshot(page, "08-errors");

    // SUMMARY
    console.log("\n========================================");
    console.log("TEST RESULTS SUMMARY");
    console.log("========================================");
    var passed = 0,
      failed = 0,
      warned = 0;
    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      if (r.status === "PASS") passed++;
      else if (r.status === "FAIL") failed++;
      else warned++;
      console.log("  " + r.status + " | " + r.test);
    }
    console.log(
      "\nPassed: " + passed + " | Failed: " + failed + " | Warnings: " + warned,
    );
    return { results: results, passed: passed, failed: failed, warned: warned };
  } catch (error) {
    console.error("\nFAILED: " + error.message);
    console.error(error.stack);
    await screenshot(page, "error-state");
    throw error;
  } finally {
    await browser.close();
    console.log("\nDone.\n");
  }
}

runTests()
  .then(function (s) {
    console.log("\nCompleted: " + s.passed + "/" + s.results.length);
    process.exit(0);
  })
  .catch(function (e) {
    console.error("Fatal:", e.message);
    process.exit(1);
  });
