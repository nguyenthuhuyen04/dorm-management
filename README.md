# Quan ly ky tuc xa

Backend NestJS quan ly ky tuc xa, dung TypeORM va MySQL.

## Yeu cau

- Node.js
- npm
- MySQL

## Cai dat

```bash
npm install
```

Neu PowerShell chan lenh `npm`, dung:

```bash
npm.cmd install
```

## Cau hinh database Aiven

Tao file `.env` tu file mau `.env.example`, sau do dien password that tu Aiven:

```env
DB_HOST=mysql-188bbf82-st-c289.c.aivencloud.com
DB_PORT=11924
DB_USERNAME=avnadmin
DB_PASSWORD=CLICK_TO_REVEAL_PASSWORD
DB_DATABASE=quan_ly_ky_tuc_xa
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false
```

Trong Aiven, bam `CLICK_TO_REVEAL_PASSWORD`, copy password that va thay vao `DB_PASSWORD`.

Import database mau vao Aiven:

```bash
mysql --host=mysql-188bbf82-st-c289.c.aivencloud.com --port=11924 --user=avnadmin -p --ssl-mode=REQUIRED < database/quan_ly_ky_tuc_xa.sql
```

Neu PowerShell bao khong tim thay `mysql`, dung duong dan day du toi file `mysql.exe` trong thu muc MySQL cua ban.

## Chay du an

Chay che do development co watch:

```bash
npm run start:dev
```

Neu PowerShell chan lenh `npm`, dung:

```bash
npm.cmd run start:dev
```

Chay binh thuong:

```bash
npm run start
```

Chay ban production sau khi build:

```bash
npm run build
npm run start:prod
```

## Kiem tra code

Build:

```bash
npm run build
```

Test:

```bash
npm test
```

Test dang watch:

```bash
npm run test:watch
```

Lint va tu dong fix:

```bash
npm run lint
```

Kiem tra TypeScript:

```bash
npx tsc --noEmit
```

Tren PowerShell co the dung cac lenh tuong ung:

```bash
npm.cmd run build
npm.cmd test -- --runInBand
npm.cmd run lint
npx.cmd tsc --noEmit
```

## API phong

Base URL mac dinh:

```text
http://localhost:3000
```

Mot so endpoint:

```text
GET    /rooms
GET    /rooms/:id
POST   /rooms
PATCH  /rooms/:id
DELETE /rooms/:id
```
