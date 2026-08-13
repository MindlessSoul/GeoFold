# GeoFold — Cara Setup Pembayaran (Midtrans QRIS + Activation Key)

Catatan langkah-langkah ngaktifin pembayaran Premium. Kode-nya udah beres & aman —
ini murni setup dashboard + env. Simpan file ini buat pegangan.

---

## Ringkasan: 2 cara user dapat Premium

1. **QRIS (Midtrans)** — otomatis. User tap Upgrade → scan QR → bayar → Premium aktif sendiri.
2. **Activation Key** — manual. Kamu generate kode → jual/kasih → user redeem di app.

Harga default: **Rp49.000 / 30 hari** (bisa diubah lewat env).
Setelah 30 hari Premium habis → balik ke Free (data tetap aman & bisa export).

---

## FASE 1 — Daftar & TES (Sandbox: gratis, tanpa verifikasi)

**1. Daftar Midtrans**
- Buka https://midtrans.com → Sign Up → bikin akun.
- Setelah masuk, kamu di mode **Sandbox** (uang bohongan, buat tes).

**2. Ambil Server Key (sandbox)**
- Dashboard → **Settings → Access Keys** → copy **Server Key** (diawali `SB-Mid-server-...`).
- ⚠️ Server key = RAHASIA. Tempel langsung ke Vercel, JANGAN ke chat / GitHub.

**3. Aktifin QRIS**
- Dashboard → **Settings → Payment / Snap Preferences** → pastikan **QRIS** enabled.

**4. Masukin ke Vercel** (Settings → Environment Variables → Add):

| Key | Value |
|-----|-------|
| `MIDTRANS_SERVER_KEY` | server key sandbox |
| `MIDTRANS_IS_PRODUCTION` | `false` |
| `PREMIUM_PRICE_IDR` | `49000` |
| `PREMIUM_DAYS` | `30` |

→ Save → **Deployments → ⋯ → Redeploy**.

**5. Set webhook di Midtrans**
- Dashboard → **Settings → Configuration → Payment Notification URL**:
  ```
  https://<domain-vercel-mu>/api/payments/midtrans/webhook
  ```

**6. Tes**
- App → **Subscription → Upgrade** → QR muncul.
- Pakai **simulator sandbox Midtrans** buat "bayar" → webhook jalan → Premium aktif ✅.

---

## FASE 2 — GO LIVE (pas mau terima uang beneran)

**7. Verifikasi bisnis di Midtrans** (wajib buat production)
- Isi data usaha + **KTP** + **rekening bank** (buat pencairan) → tunggu approval.

**8. Ganti ke production key**
- Dashboard mode **Production** → Settings → Access Keys → copy **Server Key** production (`Mid-server-...`).
- Vercel → update `MIDTRANS_SERVER_KEY` (production) + ubah `MIDTRANS_IS_PRODUCTION` = **`true`** → Redeploy.
- Set webhook URL lagi di dashboard **Production**.

---

## Activation Key (jualan manual / reseller)

- Kode disimpan sebagai **hash** di tabel `activation_keys` (aman walau DB bocor).
- User redeem lewat halaman Subscription → dapet Premium sesuai `GrantsDays`.
- ⚠️ Belum ada tombol/tool buat GENERATE kode — sekarang harus insert manual via SQL,
  atau minta dibikinin **script generate key** (jalanin sekali → keluar kode buat dijual).

---

## Siapa ngerjain apa

| Langkah | Siapa |
|---|---|
| Daftar Midtrans, ambil key, verifikasi bisnis, set webhook | **Kamu** (butuh akun + data usaha) |
| Set env di Vercel | **Kamu** (bisa dipandu) |
| Kode pembayaran (QRIS charge, webhook, redeem) | ✅ Selesai |

---

## Keamanan (penting)
- `MIDTRANS_SERVER_KEY` = **rahasia** → cuma di Vercel env, jangan di chat/GitHub.
- Webhook udah verifikasi **signature + jumlah bayar + anti dobel-grant** (aman dari pemalsuan).
- Uang masuk ke akun **Midtrans merchant**-mu → di-settle ke rekening bank-mu (dipotong fee ~0.7% QRIS).
