# Unicom University — Production Deployment Guide (Phase 18)

Panduan operasional dan deployment tingkat produksi untuk arsitektur Unicom University.

---

## 1. Topologi Infrastruktur Produksi

```
[ Internet / Corporate VPN ]
            │
      [ Cloudflare CDN / WAF / SSL Termination ]
            │
   ┌────────┴────────┐
   │ Reverse Proxy   │ (NGINX / Caddy with TLS 1.3 & HSTS)
   └────────┬────────┘
            ├─────────────────────────┐
            │                         │
  [ Next.js Web Client ]     [ NestJS Backend API ]
   (Port 3000, 3 Replicas)    (Port 4000, 4 Replicas)
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
     [ PostgreSQL 16 ]           [ Redis 7 ]           [ Background Worker ]
   (Primary + Read Replica)   (BullMQ / Distributed    (Job Processor / AI
                               Cache & Heartbeats)      Pipeline Consumer)
```

---

## 2. Prosedur Deployment Zero-Downtime

### A. Persiapan Environment
1. Salin `.env.example` ke `.env.production` di server target:
   ```bash
   cp .env.example .env.production
   ```
2. Pastikan rahasia produksi (JWT secret, database password, API keys) telah digenerasi dengan entropi tinggi (`openssl rand -base64 32`).

### B. Menjalankan Kontainer dengan Docker Compose
```bash
# Build dan jalankan seluruh microservices dalam mode detached
docker compose -f docker-compose.yml up --build -d

# Periksa status seluruh kontainer
docker compose ps

# Pantau log secara langsung
docker compose logs -f
```

---

## 3. Database Migration & Automated Backup Strategy

### Backup Otomatis Harian (Cron Job):
```bash
# Script: /opt/scripts/backup-unicom-db.sh
#!/bin/bash
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/unicom-university"
mkdir -p $BACKUP_DIR

docker exec -t unicom-postgres pg_dump -U unicom_admin unicom_university | gzip > $BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz
# Hapus backup yang lebih lama dari 30 hari
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +30 -exec rm {} \;
```

### Restore Database dari File Backup:
```bash
gunzip < /var/backups/unicom-university/db_backup_20260822_000000.sql.gz | docker exec -i unicom-postgres psql -U unicom_admin -d unicom_university
```

---

## 4. Smoke Test Deployment Verification
Setelah deployment, jalankan verifikasi probe:
```bash
# 1. Health Liveness Check
curl -f http://localhost:4000/api/v1/health/liveness

# 2. Health Readiness Check
curl -f http://localhost:4000/api/v1/health/readiness

# 3. Web Client Probe
curl -f -I http://localhost:3000
```
Status respons HTTP `200 OK` memvalidasi kesiapan sistem untuk menerima lalu lintas produksi.
