"""
Django settings for backend project.
All configuration is driven by the .env file next to manage.py.
"""

import os
import secrets
from pathlib import Path
from dotenv import load_dotenv

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env from the backend root (same directory as manage.py)
_env_path = BASE_DIR / '.env'
load_dotenv(_env_path, override=True)

# ── Core security ─────────────────────────────────────────────────────────────

# Generate and persist a secret key automatically if not set in .env
_secret = os.getenv('SECRET_KEY', '').strip()
if not _secret or _secret.startswith('django-insecure-'):
    _secret = 'django-insecure-' + secrets.token_urlsafe(50)

SECRET_KEY = _secret

DEBUG = os.getenv('DEBUG', 'True').strip().lower() in ('true', '1', 'yes')

_allowed_raw = os.getenv('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1,0.0.0.0')
ALLOWED_HOSTS = [h.strip() for h in _allowed_raw.split(',') if h.strip()]

# ── Installed apps ─────────────────────────────────────────────────────────────
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'api',
]

# ── Middleware ─────────────────────────────────────────────────────────────────
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',   # must be first
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'

# ── Database ───────────────────────────────────────────────────────────────────
_db_url = os.getenv('DATABASE_URL', '').strip()

if _db_url:
    # Support DATABASE_URL=sqlite:///path/to/db.sqlite3
    if _db_url.startswith('sqlite:///'):
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME':   Path(_db_url[len('sqlite:///'):]),
            }
        }
    else:
        # Could be extended for postgres etc.
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME':   BASE_DIR / 'db.sqlite3',
            }
        }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME':   BASE_DIR / 'db.sqlite3',
        }
    }

# ── Password validation ────────────────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ── Internationalisation ───────────────────────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE     = os.getenv('TIME_ZONE', 'UTC')
USE_I18N      = True
USE_TZ        = True

# ── Static files ───────────────────────────────────────────────────────────────
STATIC_URL = 'static/'

# ── CORS ───────────────────────────────────────────────────────────────────────
_cors_raw = os.getenv(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:5173,http://127.0.0.1:5173,http://192.168.0.100:5173'
)
CORS_ALLOWED_ORIGINS    = [o.strip() for o in _cors_raw.split(',') if o.strip()]
CORS_ALLOW_CREDENTIALS  = True
CORS_ALLOW_ALL_ORIGINS  = os.getenv('CORS_ALLOW_ALL', 'False').strip().lower() in ('true', '1')

# ── REST Framework ─────────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    # Disable pagination by default (media lists can be large)
    'DEFAULT_PAGINATION_CLASS': None,
    'PAGE_SIZE': None,
}

# ── Media server config (passed through to api/views.py via env) ──────────────
# These are read directly by views.py; listed here for documentation.
# MEDIA_PUBLIC_SERVER_7  = http://172.16.50.7
# MEDIA_PUBLIC_SERVER_8  = http://172.16.50.8
# MEDIA_PUBLIC_SERVER_9  = http://172.16.50.9
# MEDIA_PUBLIC_SERVER_12 = http://172.16.50.12
# MEDIA_PUBLIC_SERVER_14 = http://172.16.50.14

# ── Proxy / cache tuning (optional overrides) ─────────────────────────────────
BROWSE_CACHE_TTL     = int(os.getenv('BROWSE_CACHE_TTL',     '300'))   # seconds
BROWSE_CACHE_MAXSIZE = int(os.getenv('BROWSE_CACHE_MAXSIZE', '512'))
PROXY_TIMEOUT        = int(os.getenv('PROXY_TIMEOUT',        '60'))    # seconds

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
