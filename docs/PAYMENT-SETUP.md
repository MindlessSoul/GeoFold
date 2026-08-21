# GeoFold — Setup Pembayaran (Midtrans Snap: SEMUA metode)

Kode udah pakai **Midtrans Snap** → halaman checkout otomatis nampilin semua metode yang kamu
aktifin (kartu, transfer bank/VA, GoPay, ShopeePay, QRIS, dll). Ini tinggal setup dashboard + env.

Ada juga **Activation Key** (kode redeem) buat jualan manual/reseller — lihat bagian bawah.

Domain: **geofold.sayba.id** · Webhook: `https://geofold.sayba.id/api/payments/midtrans/webhook`

---

## FASE 1 — Daftar & ambil Server Key (Sandbox: gratis, tanpa verifikasi)

1. Buka **dashboard.midtrans.com** → login / daftar.
2. Pastikan mode **Sandbox** (toggle Sandbox/Production di kiri atas).
3. **Settings → Access Keys** → copy **Server Key** (diawali `SB-Mid-server-...`).
   - ⚠️ Server Key = RAHASIA. Tempel langsung ke Vercel, JANGAN ke chat/GitHub.

## FASE 2 — Masukin ke Vercel

4. **Vercel → geo-fold → Settings → Environment Variables → Add** (satu-satu):

| Key | Value |
|-----|-------|
| `MIDTRANS_SERVER_KEY` | server key sandbox (tandai **Sensitive**) |
| `MIDTRANS_IS_PRODUCTION` | `false` |
| `PREMIUM_PRICE_IDR` | `49000` |
| `PREMIUM_DAYS` | `30` |

5. Save → **Deployments → ⋯ → Redeploy**.

## FASE 3 — Webhook: kasih URL app ke Midtrans

6. Midtrans → **Settings → Configuration**.
7. **Payment Notification URL**:
   ```
   https://geofold.sayba.id/api/payments/midtrans/webhook
   ```
8. (opsional) **Finish Redirect URL** = `https://geofold.sayba.id/subscription`.
9. Save.

## FASE 4 — Aktifin metode pembayaran

10. Midtrans → **Settings → Snap Preferences → Payment Methods** → **aktifin** semua yang mau
    ditampilin: kartu, bank transfer/VA, GoPay, ShopeePay, QRIS, dll.

## FASE 5 — Tes (sandbox)

11. `geofold.sayba.id` → login → **Subscription → Upgrade ke Premium**.
12. Harusnya **redirect ke halaman Midtrans** berisi semua metode.
13. Bayar pakai **simulator sandbox** Midtrans → webhook jalan → **Premium aktif** ✅.

- Kalau muncul **"Gagal memulai pembayaran"** → `MIDTRANS_SERVER_KEY` belum keisi (route balik 503).

---

## FASE 6 — GO LIVE (pas mau terima uang beneran)

14. Midtrans: **verifikasi bisnis** (data usaha + KTP + rekening bank) → tunggu approval.
15. Mode **Production** → Settings → Access Keys → copy **Server Key** production (`Mid-server-...`).
16. Vercel: update `MIDTRANS_SERVER_KEY` (production) + ubah `MIDTRANS_IS_PRODUCTION` = **`true`** → Redeploy.
17. Set **Payment Notification URL** lagi di dashboard **Production**.

---

## Activation Key (jualan manual / reseller)
- User redeem kode di halaman Subscription → dapet Premium sesuai `GrantsDays`.
- Kode disimpan sebagai **hash** (aman walau DB bocor).
- ⚠️ Belum ada tombol GENERATE kode — sekarang insert manual via SQL, atau minta dibikinin script.

## Keamanan
- `MIDTRANS_SERVER_KEY` = rahasia → cuma di Vercel env.
- Webhook verifikasi **signature + jumlah bayar + anti dobel-grant** (aman dari pemalsuan).
- Uang masuk ke akun **Midtrans merchant**-mu → settle ke rekening bank (fee ~0.7% QRIS, beda-beda per metode).
