# backend/core/settings/__init__.py
"""
Django settings package for LifePlace.

Split from settings.py (927 lines) into focused modules.
Import order matters — base must come first, celery_conf after redis_conf.
"""
from .base import *  # noqa: F401,F403
from .storage import *  # noqa: F401,F403
from .redis_conf import *  # noqa: F401,F403
from .cors import *  # noqa: F401,F403
from .auth import *  # noqa: F401,F403
from .rest_framework import *  # noqa: F401,F403
from .email import *  # noqa: F401,F403
from .logging_conf import *  # noqa: F401,F403
from .celery_conf import *  # noqa: F401,F403
from .security import *  # noqa: F401,F403
