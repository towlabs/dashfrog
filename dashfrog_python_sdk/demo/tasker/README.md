
# 🎫 Tasker - Ticket Management System

Application de gestion de tickets complète avec FastAPI, Celery et monitoring DashFrog.

## 🚀 Fonctionnalités

- **API REST complète** avec FastAPI
- **Gestion d'utilisateurs** (CRUD)
- **Gestion de tickets** (CRUD avec filtres)
- **Tâches asynchrones** Celery pour:
  - Mise à jour des infos utilisateur sur tous les tickets
  - Envoi de notifications
- **Monitoring intégré** avec DashFrog SDK

## 📦 Installation

Les dépendances sont déjà incluses dans `pyproject.toml` :
- `fastapi[standard]`
- `sqlalchemy`
- `celery`
- `redis`

```bash
# Installer les dépendances
uv sync --group demo --group celery
```
