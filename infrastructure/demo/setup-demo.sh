#!/bin/bash
set -e

# =============================================================================
# GuayCampo — Script de setup para demo
# Levanta el stack completo con datos pre-cargados en ~5 minutos.
# Requisitos: Docker, Node.js 20+
# Uso: bash infrastructure/demo/setup-demo.sh
# =============================================================================

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Directorio raíz del proyecto (dos niveles arriba del script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         GuayCampo — Setup Demo              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""

# -----------------------------------------------------------------------------
# Verificar dependencias
# -----------------------------------------------------------------------------
check_deps() {
  echo -e "${YELLOW}▶ Verificando dependencias...${NC}"

  if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker no encontrado. Instalalo desde https://docker.com${NC}"
    exit 1
  fi

  if ! docker info &> /dev/null; then
    echo -e "${RED}✗ Docker no está corriendo. Iniciá Docker Desktop e intentá de nuevo.${NC}"
    exit 1
  fi

  if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js no encontrado. Instalalo desde https://nodejs.org (versión 20+)${NC}"
    exit 1
  fi

  NODE_VER=$(node -v | cut -d. -f1 | tr -d 'v')
  if [ "$NODE_VER" -lt 20 ]; then
    echo -e "${RED}✗ Node.js 20+ requerido. Versión actual: $(node -v)${NC}"
    exit 1
  fi

  echo -e "${GREEN}  ✓ Docker $(docker --version | cut -d' ' -f3 | tr -d ',')${NC}"
  echo -e "${GREEN}  ✓ Node.js $(node -v)${NC}"
}

# -----------------------------------------------------------------------------
# Levantar infraestructura base (postgres + redis + emqx)
# -----------------------------------------------------------------------------
start_infra() {
  echo ""
  echo -e "${YELLOW}▶ Levantando infraestructura (PostgreSQL, Redis, EMQX)...${NC}"

  cd "$SCRIPT_DIR"

  # Detener containers previos si quedaron corriendo
  docker compose -f docker-compose.demo.yml down --remove-orphans 2>/dev/null || true

  docker compose -f docker-compose.demo.yml up -d postgres redis emqx

  echo -e "   Esperando que PostgreSQL esté listo..."
  local retries=0
  until docker exec guaycampo-postgres pg_isready -U guaycampo -d guaycampo > /dev/null 2>&1; do
    retries=$((retries + 1))
    if [ "$retries" -gt 30 ]; then
      echo -e "${RED}✗ PostgreSQL no respondió en 60 segundos. Revisá los logs:${NC}"
      echo -e "  docker compose -f infrastructure/demo/docker-compose.demo.yml logs postgres"
      exit 1
    fi
    sleep 2
    printf "."
  done
  echo ""
  echo -e "${GREEN}  ✓ PostgreSQL listo${NC}"
  echo -e "${GREEN}  ✓ Redis iniciado${NC}"
  echo -e "${GREEN}  ✓ EMQX iniciado${NC}"
}

# -----------------------------------------------------------------------------
# Instalar dependencias npm (solo si node_modules no existe)
# -----------------------------------------------------------------------------
install_deps() {
  echo ""
  echo -e "${YELLOW}▶ Instalando dependencias npm...${NC}"

  cd "$ROOT_DIR"

  if [ ! -d "node_modules" ]; then
    npm install --silent
    echo -e "${GREEN}  ✓ Dependencias instaladas${NC}"
  else
    echo -e "${GREEN}  ✓ Dependencias ya instaladas (saltando)${NC}"
  fi
}

# -----------------------------------------------------------------------------
# Correr migraciones SQL
# -----------------------------------------------------------------------------
run_migrations() {
  echo ""
  echo -e "${YELLOW}▶ Creando schema de base de datos...${NC}"

  cd "$ROOT_DIR"

  local migration_count=0
  for migration in packages/database/migrations/[0-9]*.sql; do
    [ -f "$migration" ] || continue
    filename=$(basename "$migration")
    printf "   Aplicando %-40s" "$filename..."
    if docker exec -i guaycampo-postgres psql -U guaycampo -d guaycampo < "$migration" > /dev/null 2>&1; then
      echo -e " ${GREEN}ok${NC}"
    else
      echo -e " ${YELLOW}(ya aplicado o sin cambios)${NC}"
    fi
    migration_count=$((migration_count + 1))
  done

  echo -e "${GREEN}  ✓ $migration_count migraciones procesadas${NC}"
}

# -----------------------------------------------------------------------------
# Cargar seeds base + datos de demo
# -----------------------------------------------------------------------------
run_seeds() {
  echo ""
  echo -e "${YELLOW}▶ Cargando datos de demo...${NC}"

  cd "$ROOT_DIR"

  # Seeds base (planes, tenant demo, roles, commodities, parámetros)
  for seed in packages/database/seeds/[0-9]*.sql; do
    [ -f "$seed" ] || continue
    filename=$(basename "$seed")
    printf "   Cargando %-40s" "$filename..."
    if docker exec -i guaycampo-postgres psql -U guaycampo -d guaycampo < "$seed" > /dev/null 2>&1; then
      echo -e " ${GREEN}ok${NC}"
    else
      echo -e " ${YELLOW}(ya cargado o sin cambios)${NC}"
    fi
  done

  # Datos operativos completos
  printf "   Cargando %-40s" "demo-full.sql..."
  if docker exec -i guaycampo-postgres psql -U guaycampo -d guaycampo < "$SCRIPT_DIR/seeds/demo-full.sql" > /dev/null 2>&1; then
    echo -e " ${GREEN}ok${NC}"
  else
    echo -e " ${YELLOW}(ya cargado o sin cambios)${NC}"
  fi

  # Datos del día de hoy (turnos, cola, tickets activos)
  printf "   Cargando %-40s" "demo-today.sql..."
  if docker exec -i guaycampo-postgres psql -U guaycampo -d guaycampo < "$SCRIPT_DIR/seeds/demo-today.sql" > /dev/null 2>&1; then
    echo -e " ${GREEN}ok${NC}"
  else
    echo -e " ${YELLOW}(ya cargado o sin cambios)${NC}"
  fi

  echo -e "${GREEN}  ✓ Datos de demo cargados${NC}"
}

# -----------------------------------------------------------------------------
# Levantar todos los servicios (construye imágenes si hace falta)
# -----------------------------------------------------------------------------
start_services() {
  echo ""
  echo -e "${YELLOW}▶ Construyendo y levantando todos los servicios...${NC}"
  echo -e "   (la primera vez puede tardar 3-5 minutos mientras construye las imágenes)"
  echo ""

  cd "$SCRIPT_DIR"
  docker compose -f docker-compose.demo.yml up -d

  echo ""
  echo -e "${YELLOW}   Esperando que los servicios estén saludables...${NC}"

  local services=("3001:auth" "3002:shifts" "3003:scale" "3004:lab" "3005:silos" "3006:billing" "3007:notifications" "3000:web")

  for service in "${services[@]}"; do
    local port="${service%%:*}"
    local name="${service##*:}"
    local attempts=0
    printf "   %-20s" "$name ($port)..."
    while [ $attempts -lt 40 ]; do
      if curl -sf "http://localhost:${port}/health" > /dev/null 2>&1; then
        echo -e " ${GREEN}listo${NC}"
        break
      fi
      attempts=$((attempts + 1))
      if [ $attempts -eq 40 ]; then
        echo -e " ${YELLOW}(aún iniciando — puede tardar un poco más)${NC}"
      fi
      sleep 3
    done
  done
}

# -----------------------------------------------------------------------------
# Mostrar resumen final
# -----------------------------------------------------------------------------
show_summary() {
  echo ""
  echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║              GuayCampo Demo listo!                          ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${BLUE}Aplicacion web:${NC}      http://localhost:3000"
  echo -e "${BLUE}API Gateway (Kong):${NC}  http://localhost:8000"
  echo -e "${BLUE}Base de datos:${NC}       http://localhost:8080  (Adminer)"
  echo -e "${BLUE}Redis:${NC}               http://localhost:8081  (Redis Commander)"
  echo -e "${BLUE}EMQX Dashboard:${NC}      http://localhost:18083"
  echo ""
  echo -e "${YELLOW}Credenciales de acceso:${NC}"
  echo ""
  echo -e "  Administrador:"
  echo -e "    Email:     admin@demo.guaycampo.com"
  echo -e "    Password:  Demo1234!"
  echo ""
  echo -e "  Operador Balanza:"
  echo -e "    Email:     balanza@demo.guaycampo.com"
  echo -e "    Password:  Demo1234!"
  echo ""
  echo -e "  Laboratorista:"
  echo -e "    Email:     lab@demo.guaycampo.com"
  echo -e "    Password:  Demo1234!"
  echo ""
  echo -e "  Administrativo:"
  echo -e "    Email:     admin2@demo.guaycampo.com"
  echo -e "    Password:  Demo1234!"
  echo ""
  echo -e "${YELLOW}Para detener el demo:${NC}"
  echo -e "  cd infrastructure/demo && docker compose -f docker-compose.demo.yml down"
  echo ""
  echo -e "${YELLOW}Para limpiar todo (incluyendo datos):${NC}"
  echo -e "  cd infrastructure/demo && docker compose -f docker-compose.demo.yml down -v"
  echo ""
}

# -----------------------------------------------------------------------------
# Ejecutar pasos en orden
# -----------------------------------------------------------------------------
check_deps
start_infra
install_deps
run_migrations
run_seeds
start_services
show_summary
